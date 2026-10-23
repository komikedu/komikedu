import type { BentukBalon } from "./types";

/**
 * Bentuk balon dialog bergaya komik. Semua geometri dihitung dengan kode (bukan gambar), jadi tajam di semua ukuran
 * dan sama persis di editor, PDF, dan salinan terbit. Koordinat relatif terhadap pojok kiri-atas balon (lebar w, tinggi h).
 */
export const BENTUK_BALON: { id: BentukBalon; nama: string; /** jenis balon yang cocok saat bentuk ini dipilih */ jenis: "bicara" | "pikir" }[] = [
  { id: "oval", nama: "Oval", jenis: "bicara" },
  { id: "kotak", nama: "Kotak bayangan", jenis: "bicara" },
  { id: "awan", nama: "Awan pikiran", jenis: "pikir" },
  { id: "ledakan", nama: "Ledakan", jenis: "bicara" },
  { id: "teriak", nama: "Teriakan", jenis: "bicara" },
  { id: "gerak", nama: "Oval bergerak", jenis: "bicara" },
];

export const namaBentuk = (id: BentukBalon) => BENTUK_BALON.find((b) => b.id === id)?.nama ?? id;

export type Titik = { x: number; y: number };

/** Bintang bergerigi yang memenuhi kotak: `n` ujung, lekuk di `dalam` (0..1) kali jari-jari, panjang ujung sedikit tidak rata. */
export function titikGerigi(w: number, h: number, n: number, dalam: number): Titik[] {
  const jumlah = Math.max(6, Math.min(40, Math.round(n)));
  const rx = w / 2;
  const ry = h / 2;
  const hasil: Titik[] = [];
  for (let i = 0; i < jumlah * 2; i++) {
    const luar = i % 2 === 0;
    const sudut = (i * Math.PI) / jumlah - Math.PI / 2;
    const f = luar ? 1 - 0.12 * (((i * 7) % 5) / 4) : dalam + 0.06 * (((i * 5) % 3) / 2);
    hasil.push({ x: rx + Math.cos(sudut) * rx * f, y: ry + Math.sin(sudut) * ry * f });
  }
  return hasil;
}

/** Gumpalan awan: lingkaran-lingkaran mengelilingi tepi elips; isi tengah ditutup elips yang lebih kecil. */
export function lingkaranAwan(w: number, h: number): { lingkaran: { x: number; y: number; r: number }[]; tengah: { x: number; y: number; rx: number; ry: number } } {
  const n = Math.max(8, Math.min(18, Math.round((w + h) / 40)));
  const r = Math.min(w, h) * 0.17;
  const rx = w / 2 - r - 3;
  const ry = h / 2 - r - 3;
  const lingkaran = Array.from({ length: n }, (_, i) => {
    const a = (i * 2 * Math.PI) / n;
    return { x: w / 2 + Math.cos(a) * rx, y: h / 2 + Math.sin(a) * ry, r };
  });
  return { lingkaran, tengah: { x: w / 2, y: h / 2, rx: Math.max(1, rx), ry: Math.max(1, ry) } };
}

/** Garis gerak di sekitar sudut kiri-atas dan kanan-bawah oval, seperti tanda balon bergetar. */
export function garisGerak(w: number, h: number): [number, number, number, number][] {
  const garis: [number, number, number, number][] = [];
  for (const pusat of [Math.PI * 1.25, Math.PI * 0.25]) {
    for (let i = 0; i < 3; i++) {
      const a = pusat + (i - 1) * 0.3;
      const panjang = Math.min(w, h) * (0.16 - Math.abs(i - 1) * 0.04);
      const x1 = w / 2 + Math.cos(a) * (w / 2 + 6);
      const y1 = h / 2 + Math.sin(a) * (h / 2 + 6);
      garis.push([x1, y1, x1 + Math.cos(a) * panjang, y1 + Math.sin(a) * panjang]);
    }
  }
  return garis;
}

/** Bagian dalam balon yang aman untuk teks (kotak di tengah), menurut bentuknya. */
export function areaTeks(bentuk: BentukBalon | undefined, w: number, h: number): { x: number; y: number; w: number; h: number } {
  const f = bentuk === "ledakan" ? 0.6 : bentuk === "teriak" ? 0.56 : bentuk === "awan" ? 0.74 : bentuk === "gerak" ? 0.78 : bentuk === "kotak" ? 0.92 : 0.82;
  return { x: (w * (1 - f)) / 2, y: (h * (1 - f)) / 2, w: w * f, h: h * f };
}

/** Ukuran awal balon baru menurut bentuknya: bentuk bergerigi butuh ruang lebih agar teks tetap muat. */
export function ukuranBentuk(bentuk: BentukBalon | undefined, w: number, h: number): { w: number; h: number } {
  if (bentuk === "ledakan" || bentuk === "teriak") return { w: Math.max(w, 300), h: Math.max(h, 220) };
  if (bentuk === "awan") return { w: Math.max(w, 280), h: Math.max(h, 170) };
  return { w, h };
}
