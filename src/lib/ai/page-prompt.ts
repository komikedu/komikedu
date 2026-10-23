import type { PageImageRequest } from "./image-provider";
import type { Rect } from "./layouts";

const pct = (n: number) => `${Math.round(n * 100)}%`;
const describeRect = (r: Rect) =>
  `kiri ${pct(r.x)}, atas ${pct(r.y)}, lebar ${pct(r.w)}, tinggi ${pct(r.h)} dari halaman`;

export function buildPagePrompt(req: PageImageRequest): string {
  if (req.panels.length < 1) throw new Error("Halaman tanpa panel");
  const panels = req.panels
    .map(
      (p, i) =>
        `Panel ${i + 1} (${describeRect(p.rect)}): ${p.adegan}` +
        (p.karakter.length ? ` Karakter: ${p.karakter.join(", ")}.` : ""),
    )
    .join("\n");
  const chars = req.karakter.map((k) => `- ${k.nama}: ${k.deskripsi}`).join("\n");

  return [
    `Gambar SATU halaman komik edukasi vertikal (rasio 3:4) untuk anak SD, gaya ${req.gaya}.`,
    `Tata letak: ${req.panels.length} panel pada posisi berikut, masing-masing berbingkai garis hitam dan dipisahkan celah putih.`,
    panels,
    chars ? `Karakter harus tampil konsisten (wajah, rambut, pakaian sama di semua panel):\n${chars}` : "",
    req.referenceImages?.length ? "Ikuti desain karakter pada gambar referensi yang dilampirkan." : "",
    "ATURAN KERAS: jangan gambar teks, huruf, angka, balon kata, tanda air, atau logo apa pun. " +
      "Papan nama toko, spanduk, poster, label, sampul buku, layar, dan papan tulis harus POLOS tanpa tulisan apa pun " +
      "(boleh berisi gambar sederhana atau warna saja). " +
      "Isi seluruh area setiap panel dengan gambar adegan; jangan ada kotak, balon, atau area putih kosong di dalam panel. " +
      "Konten ramah anak, tanpa kekerasan.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
