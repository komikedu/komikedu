import type { ElemenTeks } from "./types";

/**
 * Pustaka gaya teks komik: judul dan efek suara. Tiap gaya adalah huruf tebal bergaya dengan beberapa lapisan
 * (garis tepi luar, bayangan keras, isi) yang digambar dari belakang ke depan; lapisan terakhir adalah isi huruf.
 */
export type FontGaya = "bangers" | "luckiest" | "lilita" | "titan" | "comic";

export type LapisanTeks = { fill: string; stroke?: string; strokeWidth?: number; dx?: number; dy?: number };

/** Latar burst di belakang teks: bintang bergerigi berwarna dengan titik halftone di dalamnya dan garis tepi tebal. */
export type BurstTeks = { isi: string; titik: string; tepi: string; gerigi: number };

export type GayaTeks = {
  id: string;
  nama: string;
  font: FontGaya;
  lapisan: LapisanTeks[];
  fontSize: number;
  contoh: string;
  /** Burst bawaan gaya ini; kosong = tanpa burst (guru tetap bisa menyalakannya dengan BURST_BAWAAN). */
  burst?: BurstTeks;
  /** Ukuran kotak saat teks baru dibuat dengan gaya ini. */
  kotak?: { w: number; h: number };
};

export const BURST_BAWAAN: BurstTeks = { isi: "#ffd93b", titik: "#f08a2c", tepi: "#111111", gerigi: 16 };

export const GAYA_TEKS: GayaTeks[] = [
  {
    id: "judul-kuning",
    nama: "Judul kuning",
    font: "bangers",
    fontSize: 110,
    contoh: "JUDUL",
    lapisan: [
      { fill: "#111111", stroke: "#111111", strokeWidth: 22, dx: 6, dy: 8 },
      { fill: "#111111", stroke: "#111111", strokeWidth: 18 },
      { fill: "#ffd93b", stroke: "#f08a2c", strokeWidth: 3 },
    ],
  },
  {
    id: "sfx-ledak",
    nama: "Ledakan merah",
    font: "luckiest",
    fontSize: 110,
    contoh: "BUM!",
    lapisan: [
      { fill: "#111111", stroke: "#111111", strokeWidth: 26 },
      { fill: "#ffffff", stroke: "#ffffff", strokeWidth: 16 },
      { fill: "#e5322d", stroke: "#8f1511", strokeWidth: 2 },
    ],
  },
  {
    id: "sfx-biru",
    nama: "Biru timbul",
    font: "lilita",
    fontSize: 100,
    contoh: "WUSS",
    lapisan: [
      { fill: "#0b2a5b", stroke: "#0b2a5b", strokeWidth: 18, dx: 5, dy: 7 },
      { fill: "#ffffff", stroke: "#0b2a5b", strokeWidth: 14 },
      { fill: "#2c8be0" },
    ],
  },
  {
    id: "teriak-oranye",
    nama: "Teriak oranye",
    font: "bangers",
    fontSize: 110,
    contoh: "AWAS!",
    lapisan: [
      { fill: "#5a1a0b", stroke: "#5a1a0b", strokeWidth: 20, dx: 4, dy: 6 },
      { fill: "#ffffff", stroke: "#ffffff", strokeWidth: 12 },
      { fill: "#f08a2c", stroke: "#c2301d", strokeWidth: 3 },
    ],
  },
  {
    id: "putih-tebal",
    nama: "Putih tebal",
    font: "titan",
    fontSize: 90,
    contoh: "Bab 1",
    lapisan: [
      { fill: "#111111", stroke: "#111111", strokeWidth: 16 },
      { fill: "#ffffff" },
    ],
  },
  {
    id: "keterangan",
    nama: "Keterangan",
    font: "comic",
    fontSize: 40,
    contoh: "Keesokan harinya...",
    lapisan: [{ fill: "#111111" }],
  },
  {
    id: "burst-kuning",
    nama: "Burst kuning",
    font: "bangers",
    fontSize: 100,
    contoh: "POW!",
    kotak: { w: 400, h: 300 },
    burst: { isi: "#ffd93b", titik: "#f6a623", tepi: "#111111", gerigi: 16 },
    lapisan: [
      { fill: "#ffffff", stroke: "#ffffff", strokeWidth: 14 },
      { fill: "#e5322d", stroke: "#111111", strokeWidth: 4 },
    ],
  },
  {
    id: "burst-merah",
    nama: "Burst merah",
    font: "luckiest",
    fontSize: 96,
    contoh: "BAM!",
    kotak: { w: 400, h: 300 },
    burst: { isi: "#e5322d", titik: "#a31b17", tepi: "#111111", gerigi: 14 },
    lapisan: [
      { fill: "#111111", stroke: "#111111", strokeWidth: 18 },
      { fill: "#ffffff" },
    ],
  },
  {
    id: "burst-biru",
    nama: "Burst biru",
    font: "lilita",
    fontSize: 96,
    contoh: "ZAP!",
    kotak: { w: 400, h: 300 },
    burst: { isi: "#5fb1f2", titik: "#2c8be0", tepi: "#0b2a5b", gerigi: 18 },
    lapisan: [
      { fill: "#0b2a5b", stroke: "#0b2a5b", strokeWidth: 16 },
      { fill: "#ffffff" },
    ],
  },
  {
    id: "burst-hijau",
    nama: "Burst hijau",
    font: "bangers",
    fontSize: 100,
    contoh: "HEBAT!",
    kotak: { w: 420, h: 300 },
    burst: { isi: "#8be05a", titik: "#4fb23a", tepi: "#111111", gerigi: 15 },
    lapisan: [
      { fill: "#111111", stroke: "#111111", strokeWidth: 18 },
      { fill: "#fff44f", stroke: "#111111", strokeWidth: 2 },
    ],
  },
  {
    id: "judul-ungu",
    nama: "Judul ungu",
    font: "titan",
    fontSize: 90,
    contoh: "Seru!",
    lapisan: [
      { fill: "#3b0f5c", stroke: "#3b0f5c", strokeWidth: 18, dx: 4, dy: 6 },
      { fill: "#ffffff", stroke: "#3b0f5c", strokeWidth: 14 },
      { fill: "#9b4dd8" },
    ],
  },
  {
    id: "bisik",
    nama: "Bisikan",
    font: "comic",
    fontSize: 34,
    contoh: "(psst...)",
    lapisan: [{ fill: "#5b6470" }],
  },
];

export const gayaTeks = (id: string): GayaTeks => GAYA_TEKS.find((g) => g.id === id) ?? GAYA_TEKS[0];

export const MAKS_TEKS = 80;
export const FONT_MIN = 16;
export const FONT_MAX = 300;

/** Burst yang dipakai teks ini: pilihan guru, atau bawaan gaya; null bila tanpa burst. */
export function burstTeks(el: Pick<ElemenTeks, "gaya" | "latarBurst">): BurstTeks | null {
  const g = gayaTeks(el.gaya);
  const nyala = el.latarBurst ?? !!g.burst;
  return nyala ? (g.burst ?? BURST_BAWAAN) : null;
}

/**
 * Titik sudut bintang burst yang mengisi kotak w x h (relatif terhadap pojok kiri-atas): ujung dan lekuk bergantian
 * dengan panjang yang sedikit tidak rata seperti gambar tangan, tetapi selalu sama untuk masukan yang sama.
 */
export function titikBurst(w: number, h: number, gerigi: number): { x: number; y: number }[] {
  const n = Math.max(6, Math.min(40, Math.round(gerigi)));
  const rx = w / 2;
  const ry = h / 2;
  const hasil: { x: number; y: number }[] = [];
  for (let i = 0; i < n * 2; i++) {
    const luar = i % 2 === 0;
    const sudut = (i * Math.PI) / n - Math.PI / 2;
    const f = luar ? 1 - 0.1 * (((i * 7) % 5) / 4) : 0.66 + 0.08 * (((i * 5) % 3) / 2);
    hasil.push({ x: rx + Math.cos(sudut) * rx * f, y: ry + Math.sin(sudut) * ry * f });
  }
  return hasil;
}

/** Lapisan siap gambar: warna isi huruf diganti bila guru memilih `warna`. */
export function lapisanTeks(el: Pick<ElemenTeks, "gaya" | "warna">): LapisanTeks[] {
  const lapisan = gayaTeks(el.gaya).lapisan;
  if (!el.warna) return lapisan;
  const warna = el.warna;
  return lapisan.map((l, i) => (i === lapisan.length - 1 ? { ...l, fill: warna } : l));
}
