// Buat gambar pratinjau satu gaya visual dan potret tokoh bawaan untuk gaya itu, memakai FLUX (Cloudflare Workers AI),
// bukan Gemini. Memakai kuota gratis harian Cloudflare. Bisa dilanjutkan bila terputus: berkas yang sudah ada dilewati.
//
// Jalankan: node --env-file=.env.local --conditions=react-server --import tsx scripts/gen-gaya-flux.ts kartun-sitkom
// Tambahkan --ulang untuk membuat ulang pratinjau gaya dan semua potret.
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import sharp from "sharp";
import { CloudflareImageProvider } from "../src/lib/ai/cloudflare-image";
import { GAYA } from "../src/lib/comics/schema";
import { TOKOH_PRESET } from "../src/lib/comics/tokoh";

const SCENE =
  "Dua anak SD Indonesia (perempuan berkuncir dua dan laki-laki berkacamata, seragam putih-merah) " +
  "tersenyum sambil menghitung kue di meja kelas yang cerah.";

async function main() {
  const id = process.argv[2];
  const ulang = process.argv.includes("--ulang");
  const gaya = GAYA.find((g) => g.id === id);
  if (!gaya) throw new Error(`Gaya tidak dikenal: ${id}. Pilihan: ${GAYA.map((g) => g.id).join(", ")}`);
  const provider = new CloudflareImageProvider();

  // pratinjau 4:3 di wizard: satu panel selebar halaman setinggi 9/16 halaman (1152 x 864 dari kanvas 1152 x 1536)
  const berkasGaya = `public/gaya/${gaya.id}.webp`;
  if (ulang || !existsSync(berkasGaya)) {
    const hasil = await provider.generatePage({
      gaya: gaya.prompt,
      karakter: [],
      panels: [{ adegan: `${SCENE} Satu gambar penuh tanpa panel.`, karakter: [], rect: { x: 0, y: 0, w: 1, h: 0.5625 } }],
    });
    const meta = await sharp(hasil.image).metadata();
    const potong = await sharp(hasil.image)
      .extract({ left: 0, top: 0, width: meta.width!, height: Math.round(meta.height! * 0.5625) })
      .resize({ width: 640 })
      .webp({ quality: 80 })
      .toBuffer();
    await writeFile(berkasGaya, potong);
    console.log(`ok ${berkasGaya} ${potong.length} byte`);
  } else console.log(`lewati ${berkasGaya}`);

  for (const t of TOKOH_PRESET) {
    const berkas = `public/tokoh/${t.id}-${gaya.id}.webp`;
    if (!ulang && existsSync(berkas)) {
      console.log(`lewati ${berkas}`);
      continue;
    }
    const hasil = await provider.generatePortrait({ nama: t.nama, deskripsi: t.deskripsi, gaya: gaya.prompt });
    const buf = await sharp(hasil.image).resize({ width: 384, height: 384, fit: "cover" }).webp({ quality: 80 }).toBuffer();
    await writeFile(berkas, buf);
    console.log(`ok ${berkas} ${buf.length} byte`);
  }
}

main().catch((e) => {
  console.error("GAGAL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
