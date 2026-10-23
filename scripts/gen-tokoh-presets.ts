import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { GoogleGenAI } from "@google/genai";
import { IMAGE_MODEL } from "../src/lib/ai/gemini-image";
import sharp from "sharp";
import { GAYA } from "../src/lib/comics/schema";
import { TOKOH_PRESET } from "../src/lib/comics/tokoh";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function main() {
  for (const t of TOKOH_PRESET) {
    for (const g of GAYA) {
      const out = `public/tokoh/${t.id}-${g.id}.webp`;
      if (existsSync(out)) continue; // bisa dilanjutkan bila terputus
      const res = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents:
          `Potret karakter untuk komik edukasi anak SD Indonesia: ${t.deskripsi}. Setengah badan menghadap depan, tersenyum ramah, ` +
          `gaya ${g.prompt}. Latar belakang polos warna krem muda. Satu karakter saja. Jangan ada teks, huruf, angka, atau logo; bila memegang buku, sampulnya polos tanpa tulisan.`,
        config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "1:1" } },
      });
      const img = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
      if (!img?.data) {
        console.log(`GAGAL ${out}`);
        continue;
      }
      const buf = await sharp(Buffer.from(img.data, "base64")).resize({ width: 384 }).webp({ quality: 80 }).toBuffer();
      await writeFile(out, buf);
      console.log(`ok ${out} ${buf.length} byte`);
    }
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
