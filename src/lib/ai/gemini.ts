import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { catatPemakaian } from "./usage";

export const MODEL_LITE = "gemini-3.5-flash-lite";
export const MODEL_FLASH = "gemini-3.5-flash";

let client: GoogleGenAI | undefined;
function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY belum diatur");
  return (client ??= new GoogleGenAI({ apiKey }));
}

const RETRYABLE = new Set([429, 500, 503]);

/** Retry otomatis maksimal 3x untuk error sementara (overload, rate limit). */
async function withRetry<R>(fn: () => Promise<R>, attempts = 3): Promise<R> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (i >= attempts || status === undefined || !RETRYABLE.has(status)) throw e;
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
}

/** Panggil Gemini dengan output JSON terstruktur dan validasi dengan zod. */
export async function generateJson<T extends z.ZodType>(
  schema: T,
  prompt: string,
  model: string = MODEL_LITE,
): Promise<z.infer<T>> {
  const started = Date.now();
  const res = await withRetry(() =>
    getClient().models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(schema),
      },
    }),
  );
  const pakai = catatPemakaian(model, res.usageMetadata);
  console.info(JSON.stringify({ ai: "gemini", ...pakai, ms: Date.now() - started }));
  return schema.parse(JSON.parse(res.text ?? ""));
}
