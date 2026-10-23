import { GoogleGenAI } from "@google/genai";
import { IMAGE_MODEL } from "../src/lib/ai/gemini-image";
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const SCENE =
  "Dua anak SD Indonesia (perempuan berkuncir dua dan laki-laki berkacamata, seragam putih-merah) " +
  "tersenyum sambil menghitung kue di meja kelas yang cerah.";
const STYLES: Record<string, string> = {
  "kartun-cerah": "gaya kartun anak berwarna cerah, garis tepi hitam tegas, warna datar",
  "anime-lembut": "gaya anime lembut, mata besar, warna pastel, pencahayaan hangat",
  "buku-cerita": "gaya ilustrasi buku cerita anak dengan cat air, tekstur kertas, warna hangat",
};

async function main() {
  for (const [id, style] of Object.entries(STYLES)) {
    const res = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: `${SCENE} ${style}. Satu gambar penuh tanpa panel. Jangan ada teks, huruf, angka, atau logo.`,
      config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "4:3" } },
    });
    const img = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
    if (!img?.data) throw new Error(`gagal: ${id}`);
    const out = await sharp(Buffer.from(img.data, "base64")).resize({ width: 640 }).webp({ quality: 80 }).toBuffer();
    await writeFile(`public/gaya/${id}.webp`, out);
    console.log(`${id}: ${out.length} byte`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
