import { mkdir, readFile, writeFile } from "node:fs/promises";
import { CloudflareImageProvider } from "../src/lib/ai/cloudflare-image";

// Uji SATU panel FLUX.2 klein 4B (sekitar 110 neuron dari kuota gratis harian Cloudflare).
async function main() {
  const provider = new CloudflareImageProvider();
  const res = await provider.generatePage({
    gaya: "kartun berwarna cerah, garis tegas",
    karakter: [{ nama: "Kiki", deskripsi: "anak perempuan SD, rambut hitam dikuncir dua, seragam putih-merah, tas biru" }],
    referenceImages: [{ data: await readFile("public/tokoh/kiki-kartun-cerah.webp"), mimeType: "image/webp", label: "potret tokoh Kiki" }],
    panels: [
      {
        adegan: "Kiki berdiri di depan toko kue yang ramai sambil menunjuk lampu hias merah yang menyala di atas pintu.",
        karakter: ["Kiki"],
        rect: { x: 0, y: 0, w: 1, h: 1 },
      },
    ],
  });

  await mkdir("tmp/cloudflare", { recursive: true });
  await writeFile("tmp/cloudflare/panel-uji.png", res.image);
  console.log(`Tersimpan: tmp/cloudflare/panel-uji.png (${res.image.length} byte, model ${res.model})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
