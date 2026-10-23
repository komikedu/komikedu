import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { ImageProvider, PageImageRequest, PageImageResult } from "./image-provider";
import { buildPagePrompt } from "./page-prompt";
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
