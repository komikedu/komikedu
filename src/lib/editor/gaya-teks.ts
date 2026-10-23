import type { ElemenTeks } from "./types";

/**
 * Pustaka gaya teks komik: judul dan efek suara. Tiap gaya adalah huruf tebal bergaya dengan beberapa lapisan
 * (garis tepi luar, bayangan keras, isi) yang digambar dari belakang ke depan; lapisan terakhir adalah isi huruf.
 */
export type FontGaya = "bangers" | "luckiest" | "lilita" | "titan" | "comic" | "patrick" | "marker" | "fredoka";

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

const adaOffset = (l: LapisanTeks) => !!(l.dx || l.dy);

/** Lapisan garis tepi terluar: yang tertebal di antara lapisan tanpa offset (bukan bayangan) dan bukan isi huruf; -1 bila tidak ada. */
function indeksTepiLuar(lap: LapisanTeks[]): number {
  let hasil = -1;
  let tebal = 0;
  lap.forEach((l, i) => {
    if (i < lap.length - 1 && !adaOffset(l) && (l.strokeWidth ?? 0) > tebal) {
      hasil = i;
      tebal = l.strokeWidth ?? 0;
    }
  });
  return hasil;
}

const indeksBayangan = (lap: LapisanTeks[]) => lap.findIndex((l, i) => i < lap.length - 1 && adaOffset(l));

/** Nilai bawaan pengaturan lanjutan sebuah gaya, dalam satuan "per huruf 100". */
export function bawaanLanjut(gayaId: string) {
  const g = gayaTeks(gayaId);
  const k = 100 / g.fontSize;
  const lap = g.lapisan;
  const luar = indeksTepiLuar(lap);
  const bay = indeksBayangan(lap);
  return {
    tebalTepi: 1,
    warnaTepi: luar >= 0 ? lap[luar].fill : "#111111",
    bayanganJarak: bay >= 0 ? Math.round(Math.max(Math.abs(lap[bay].dx ?? 0), Math.abs(lap[bay].dy ?? 0)) * k) : 0,
    bayanganTebal: bay >= 0 ? Math.round((lap[bay].strokeWidth ?? 0) * k) : luar >= 0 ? Math.round((lap[luar].strokeWidth ?? 0) * k) : 12,
    warnaBayangan: bay >= 0 ? lap[bay].fill : "#111111",
  };
}

export const ADA_LANJUT = ["tebalTepi", "warnaTepi", "bayanganJarak", "bayanganTebal", "warnaBayangan"] as const;

/**
 * Lapisan siap gambar untuk sebuah teks: lapisan gaya yang diskalakan mengikuti ukuran huruf (garis tepi dan bayangan
 * ikut membesar dan mengecil), lalu pengaturan lanjutan guru (tebal dan warna garis tepi, jarak/tebal/warna bayangan).
 */
export function lapisanLanjut(el: Pick<ElemenTeks, "gaya" | "warna" | "fontSize" | "tebalTepi" | "warnaTepi" | "bayanganJarak" | "bayanganTebal" | "warnaBayangan">): LapisanTeks[] {
  const g = gayaTeks(el.gaya);
  const dasar = lapisanTeks(el);
  const skala = el.fontSize / g.fontSize;
  const satuan = el.fontSize / 100;
  const tepi = el.tebalTepi ?? 1;
  const akhir = dasar.length - 1;
  let lap: LapisanTeks[] = dasar.map((l, i) => ({
    ...l,
    strokeWidth: l.strokeWidth !== undefined ? l.strokeWidth * skala * (i < akhir ? tepi : 1) : undefined,
    dx: l.dx !== undefined ? l.dx * skala : undefined,
    dy: l.dy !== undefined ? l.dy * skala : undefined,
  }));

  const luar = indeksTepiLuar(lap);
  if (el.warnaTepi && luar >= 0) lap[luar] = { ...lap[luar], fill: el.warnaTepi, stroke: el.warnaTepi };

  if (el.bayanganJarak !== undefined || el.bayanganTebal !== undefined || el.warnaBayangan) {
    const b = bawaanLanjut(el.gaya);
    const jarak = (el.bayanganJarak ?? b.bayanganJarak) * satuan;
    const tebal = (el.bayanganTebal ?? b.bayanganTebal) * satuan;
    const warna = el.warnaBayangan ?? b.warnaBayangan;
    const bay = indeksBayangan(lap);
    if (bay >= 0) lap.splice(bay, 1);
    if (jarak > 0) lap = [{ fill: warna, stroke: tebal > 0 ? warna : undefined, strokeWidth: tebal > 0 ? tebal : undefined, dx: jarak, dy: jarak * 1.25 }, ...lap];
  }
  return lap;
}
