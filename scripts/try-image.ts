import { mkdir, writeFile } from "node:fs/promises";
import { GeminiImageProvider } from "../src/lib/ai/gemini-image";

async function main() {
  const provider = new GeminiImageProvider();
  const res = await provider.generatePage({
    layoutId: "3-satu-atas-dua-bawah",
    gaya: "kartun berwarna cerah, garis tegas",
    karakter: [
      { nama: "Kiki", deskripsi: "anak perempuan SD, rambut hitam dikuncir dua, seragam putih-merah, tas biru" },
      { nama: "Doni", deskripsi: "anak laki-laki SD, rambut hitam pendek, kacamata bulat, seragam putih-merah" },
    ],
    panels: [
      { adegan: "Kiki dan Doni berdiri di depan toko kue yang ramai, dua utas lampu hias berkelap-kelip di atas pintu.", karakter: ["Kiki", "Doni"] },
      { adegan: "Close-up Kiki berpikir sambil menunjuk lampu merah yang menyala.", karakter: ["Kiki"] },
      { adegan: "Close-up Doni tersenyum paham sambil mengacungkan jempol.", karakter: ["Doni"] },
    ],
  });

  await mkdir("tmp", { recursive: true });
  const ext = res.mimeType.includes("jpeg") ? "jpg" : "png";
  const file = `tmp/halaman-uji.${ext}`;
  await writeFile(file, res.image);
  console.log(`Tersimpan: ${file} (${res.image.length} byte, model ${res.model})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
