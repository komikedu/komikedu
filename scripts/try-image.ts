import { mkdir, writeFile } from "node:fs/promises";
import { cropPanels } from "../src/lib/ai/crop";
import { GeminiImageProvider } from "../src/lib/ai/gemini-image";
import { getLayout } from "../src/lib/ai/layouts";

async function main() {
  const provider = new GeminiImageProvider();
  const res = await provider.generatePage({
    gaya: "kartun berwarna cerah, garis tegas",
    karakter: [
      { nama: "Kiki", deskripsi: "anak perempuan SD, rambut hitam dikuncir dua, seragam putih-merah, tas biru" },
      { nama: "Doni", deskripsi: "anak laki-laki SD, rambut hitam pendek, kacamata bulat, seragam putih-merah" },
    ],
    panels: [
      { adegan: "Kiki dan Doni berdiri di depan toko kue yang ramai, dua utas lampu hias berkelap-kelip di atas pintu.", karakter: ["Kiki", "Doni"] },
      { adegan: "Close-up Kiki berpikir sambil menunjuk lampu merah yang menyala.", karakter: ["Kiki"] },
      { adegan: "Close-up Doni tersenyum paham sambil mengacungkan jempol.", karakter: ["Doni"] },
    ].map((p, i) => ({ ...p, rect: getLayout("3-satu-atas-dua-bawah").panels[i] })),
  });

  await mkdir("tmp", { recursive: true });
  const ext = res.mimeType.includes("jpeg") ? "jpg" : "png";
  const file = `tmp/halaman-uji.${ext}`;
  await writeFile(file, res.image);
  console.log(`Tersimpan: ${file} (${res.image.length} byte, model ${res.model})`);

  for (const p of await cropPanels(res.image, getLayout("3-satu-atas-dua-bawah").panels)) {
    const f = `tmp/panel-${p.urutan}.webp`;
    await writeFile(f, p.image);
    console.log(`Panel ${p.urutan}: ${f} (${p.width}x${p.height})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
