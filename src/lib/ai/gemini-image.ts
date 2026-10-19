import "server-only";
import { GoogleGenAI } from "@google/genai";
import { getLayout, type Rect } from "./layouts";
import type { ImageProvider, PageImageRequest, PageImageResult } from "./image-provider";

export const IMAGE_MODEL = "gemini-3.1-flash-image"; // Nano Banana 2
export const IMAGE_MODEL_PREMIUM = "gemini-3-pro-image"; // Nano Banana Pro

const RETRYABLE = new Set([500, 503]); // 429 pada gambar = kuota habis, bukan sementara

const pct = (n: number) => `${Math.round(n * 100)}%`;
const describeRect = (r: Rect) =>
  `kiri ${pct(r.x)}, atas ${pct(r.y)}, lebar ${pct(r.w)}, tinggi ${pct(r.h)} dari halaman`;

export function buildPagePrompt(req: PageImageRequest): string {
  const layout = getLayout(req.layoutId);
  if (layout.panels.length !== req.panels.length) {
    throw new Error(`Template ${layout.id} butuh ${layout.panels.length} panel, diberi ${req.panels.length}`);
  }
  const panels = req.panels
    .map(
      (p, i) =>
        `Panel ${i + 1} (${describeRect(layout.panels[i])}): ${p.adegan}` +
        (p.karakter.length ? ` Karakter: ${p.karakter.join(", ")}.` : ""),
    )
    .join("\n");
  const chars = req.karakter.map((k) => `- ${k.nama}: ${k.deskripsi}`).join("\n");

  return [
    `Gambar SATU halaman komik edukasi vertikal (rasio 3:4) untuk anak SD, gaya ${req.gaya}.`,
    `Tata letak: ${layout.nama}, ${layout.panels.length} panel dipisahkan garis bingkai putih tipis.`,
    panels,
    chars ? `Karakter harus tampil konsisten (wajah, rambut, pakaian sama di semua panel):\n${chars}` : "",
    req.referenceImages?.length ? "Ikuti desain karakter pada gambar referensi yang dilampirkan." : "",
    "ATURAN KERAS: jangan gambar teks, huruf, angka, balon kata, tanda air, atau logo apa pun. " +
      "Sisakan ruang kosong di bagian atas panel untuk balon dialog yang ditambahkan terpisah. " +
      "Konten ramah anak, tanpa kekerasan.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export class GeminiImageProvider implements ImageProvider {
  readonly name = "gemini";
  private client?: GoogleGenAI;

  private getClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY belum diatur");
    return (this.client ??= new GoogleGenAI({ apiKey }));
  }

  async generatePage(req: PageImageRequest): Promise<PageImageResult> {
    const model = req.premium ? IMAGE_MODEL_PREMIUM : IMAGE_MODEL;
    const parts = [
      { text: buildPagePrompt(req) },
      ...(req.referenceImages ?? []).slice(0, 3).map((r) => ({
        inlineData: { data: Buffer.from(r.data).toString("base64"), mimeType: r.mimeType },
      })),
    ];

    const started = Date.now();
    for (let attempt = 1; ; attempt++) {
      try {
        const res = await this.getClient().models.generateContent({
          model,
          contents: [{ role: "user", parts }],
          config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "3:4" } },
        });
        const img = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
        if (!img?.data) throw new Error("Model tidak mengembalikan gambar (kemungkinan diblokir moderasi)");
        console.info(
          JSON.stringify({ ai: "gemini-image", model, tokens: res.usageMetadata?.totalTokenCount, ms: Date.now() - started }),
        );
        return {
          image: new Uint8Array(Buffer.from(img.data, "base64")),
          mimeType: img.mimeType ?? "image/png",
          provider: this.name,
          model,
        };
      } catch (e) {
        const status = (e as { status?: number }).status;
        if (attempt >= 3 || status === undefined || !RETRYABLE.has(status)) throw e;
        await new Promise((r) => setTimeout(r, 3000 * attempt));
      }
    }
  }
}
