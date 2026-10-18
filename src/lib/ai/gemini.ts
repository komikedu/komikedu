import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const MODEL = "gemini-2.5-flash";

let client: GoogleGenAI | undefined;
function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY belum diatur");
  return (client ??= new GoogleGenAI({ apiKey }));
}

/** Panggil Gemini dengan output JSON terstruktur dan validasi dengan zod. */
export async function generateJson<T extends z.ZodType>(
  schema: T,
  prompt: string,
): Promise<z.infer<T>> {
  const started = Date.now();
  const res = await getClient().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(schema),
    },
  });
  console.info(
    JSON.stringify({
      ai: "gemini",
      model: MODEL,
      tokens: res.usageMetadata?.totalTokenCount,
      ms: Date.now() - started,
    }),
  );
  return schema.parse(JSON.parse(res.text ?? ""));
}
