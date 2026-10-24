import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { ImageProvider, PageImageRequest, PageImageResult, PanelEditRequest, PortraitRequest } from "./image-provider";
import { UKURAN_BAWAAN } from "@/lib/editor/types";
import { rasioAi } from "@/lib/editor/ukuran-halaman";
import { buildEditPrompt, buildPagePrompt, buildPortraitPrompt } from "./page-prompt";
import { catatPemakaian } from "./usage";

export { buildPagePrompt };

export const IMAGE_MODEL = "gemini-nano-banana-2.1"; // Nano Banana 2.1, setengah harga Nano Banana 2 per gambar
export const IMAGE_MODEL_PREMIUM = "gemini-3-pro-image"; // Nano Banana Pro

const RETRYABLE = new Set([500, 503]); // 429 pada gambar = kuota habis, bukan sementara

export class GeminiImageProvider implements ImageProvider {
  readonly name = "gemini";
  private client?: GoogleGenAI;

  private getClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY belum diatur");
    return (this.client ??= new GoogleGenAI({ apiKey }));
  }

  generatePage(req: PageImageRequest): Promise<PageImageResult> {
    const parts = [
      { text: buildPagePrompt(req) },
      ...(req.referenceImages ?? []).slice(0, 3).map((r) => ({
        inlineData: { data: Buffer.from(r.data).toString("base64"), mimeType: r.mimeType },
      })),
    ];
    return this.request(req.premium ? IMAGE_MODEL_PREMIUM : IMAGE_MODEL, parts, { aspectRatio: rasioAi(req.ukuran ?? UKURAN_BAWAAN) });
  }

  /** Ubah gambar satu panel; rasio mengikuti gambar asli (tanpa imageConfig). */
  editPanel(req: PanelEditRequest): Promise<PageImageResult> {
    const parts = [
      { text: buildEditPrompt(req) },
      { inlineData: { data: Buffer.from(req.image.data).toString("base64"), mimeType: req.image.mimeType } },
      ...(req.referenceImages ?? []).slice(0, 2).map((r) => ({
        inlineData: { data: Buffer.from(r.data).toString("base64"), mimeType: r.mimeType },
      })),
    ];
    return this.request(IMAGE_MODEL, parts);
  }

  generatePortrait(req: PortraitRequest): Promise<PageImageResult> {
    const parts = [
      { text: buildPortraitPrompt(req) },
      ...(req.referenceImages ?? []).slice(0, 2).map((r) => ({
        inlineData: { data: Buffer.from(r.data).toString("base64"), mimeType: r.mimeType },
      })),
    ];
    return this.request(IMAGE_MODEL, parts, { aspectRatio: req.bentuk === "badan" ? "3:4" : "1:1" });
  }

  private async request(
    model: string,
    parts: ({ text: string } | { inlineData: { data: string; mimeType: string } })[],
    imageConfig?: { aspectRatio: string },
  ): Promise<PageImageResult> {
    const started = Date.now();
    for (let attempt = 1; ; attempt++) {
      try {
        const res = await this.getClient().models.generateContent({
          model,
          contents: [{ role: "user", parts }],
          config: { responseModalities: ["IMAGE"], ...(imageConfig ? { imageConfig } : {}) },
        });
        const pakai = catatPemakaian(model, res.usageMetadata);
        const img = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
        if (!img?.data) throw new Error("Model tidak mengembalikan gambar (kemungkinan diblokir moderasi)");
        console.info(JSON.stringify({ ai: "gemini-image", ...pakai, ms: Date.now() - started }));
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
