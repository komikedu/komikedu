import type { EditorPage, UkuranHalaman } from "./types";
import { UKURAN_BAWAAN } from "./types";

/** Sisi halaman (unit kanvas) paling kecil dan paling besar, dan rasio terjauh yang diizinkan (3:1 atau 1:3). */
export const SISI_MIN = 400;
export const SISI_MAKS = 3000;
export const RASIO_MAKS = 3;

export type JenisUkuran = "vertikal" | "kotak" | "horizontal" | "kustom";

export const PRESET_UKURAN: { id: Exclude<JenisUkuran, "kustom">; nama: string; ukuran: UkuranHalaman }[] = [
  { id: "vertikal", nama: "Vertikal", ukuran: UKURAN_BAWAAN },
  { id: "kotak", nama: "Kotak", ukuran: { w: 1200, h: 1200 } },
  { id: "horizontal", nama: "Horizontal", ukuran: { w: 1200, h: 900 } },
];

/** Galat pesan untuk ukuran yang tidak boleh dipakai, atau null bila valid. */
export function galatUkuran(u: { w: unknown; h: unknown }): string | null {
  const { w, h } = u;
  if (typeof w !== "number" || typeof h !== "number" || !Number.isInteger(w) || !Number.isInteger(h)) return "Ukuran harus berupa bilangan bulat";
  if (w < SISI_MIN || h < SISI_MIN) return `Sisi paling kecil ${SISI_MIN}`;
  if (w > SISI_MAKS || h > SISI_MAKS) return `Sisi paling besar ${SISI_MAKS}`;
  if (w / h > RASIO_MAKS || h / w > RASIO_MAKS) return `Perbandingan sisi paling jauh ${RASIO_MAKS}:1`;
  return null;
}

export const ukuranValid = (u: { w: unknown; h: unknown }): u is UkuranHalaman => galatUkuran(u) === null;

/** Jenis ukuran untuk tampilan pilihan: preset bila persis sama, selain itu kustom. */
export function jenisUkuran(u: UkuranHalaman): JenisUkuran {
  return PRESET_UKURAN.find((p) => p.ukuran.w === u.w && p.ukuran.h === u.h)?.id ?? "kustom";
}

/** Ukuran dari kolom database; nilai kosong atau tidak valid jatuh ke ukuran bawaan. */
export function ukuranDariBaris(row: { lebar_halaman?: number | null; tinggi_halaman?: number | null } | null | undefined): UkuranHalaman {
  const u = { w: row?.lebar_halaman, h: row?.tinggi_halaman };
  return ukuranValid(u) ? { w: u.w, h: u.h } : { ...UKURAN_BAWAAN };
}

/** Ukuran komik dari halaman-halamannya (semua sama); ukuran bawaan bila belum ada halaman. */
export const ukuranDariHalaman = (pages: Pick<EditorPage, "w" | "h">[]): UkuranHalaman => (pages[0] ? { w: pages[0].w, h: pages[0].h } : { ...UKURAN_BAWAAN });

/** Rasio halaman yang didukung pembuat gambar AI dan Google Flow. */
const RASIO_AI = [
  { label: "16:9", nilai: 16 / 9 },
  { label: "4:3", nilai: 4 / 3 },
  { label: "1:1", nilai: 1 },
  { label: "3:4", nilai: 3 / 4 },
  { label: "9:16", nilai: 9 / 16 },
] as const;

/** Rasio AI yang paling dekat dengan bentuk halaman. */
export function rasioAi(u: UkuranHalaman): (typeof RASIO_AI)[number]["label"] {
  const r = Math.log(u.w / u.h);
  return RASIO_AI.reduce((a, b) => (Math.abs(Math.log(b.nilai) - r) < Math.abs(Math.log(a.nilai) - r) ? b : a)).label;
}

/** Sisi terpanjang gambar halaman hasil render (dan salinan terbit): ukuran 3:4 lama menjadi 1350 x 1800. */
export const SISI_RENDER = 1800;

/** Ukuran piksel gambar halaman hasil render dan skala terhadap unit kanvas. */
export function ukuranRender(u: UkuranHalaman): { lebar: number; tinggi: number; skala: number } {
  const skala = SISI_RENDER / Math.max(u.w, u.h);
  return { lebar: Math.round(u.w * skala), tinggi: Math.round(u.h * skala), skala };
}


const bulat = (n: number) => Math.round(n);

/**
 * Ubah ukuran semua halaman. Posisi dan ukuran panel diskalakan mengikuti sumbu masing-masing, dan gambar panel yang belum
 * diatur guru tetap otomatis memenuhi panel (dipotong, tidak diregangkan). Ukuran balon, elemen, huruf, dan gambar atur
 * sendiri mengikuti skala seragam rata-rata geometrik kedua sumbu, bukan yang terkecil. Dengan begitu perubahan bersifat
 * bolak-balik: berpindah ke ukuran lain lalu kembali mengembalikan tampilan semula (tidak menumpuk membesar atau mengecil).
 * Halaman baru dikembalikan, yang lama tidak diubah.
 */
export function skalakanHalaman(pages: EditorPage[], baru: UkuranHalaman): EditorPage[] {
  return pages.map((pg) => {
    if (pg.w === baru.w && pg.h === baru.h) return pg;
    const sx = baru.w / pg.w;
    const sy = baru.h / pg.h;
    const s = Math.sqrt(sx * sy);
    const rect = (r: { x: number; y: number; w: number; h: number }) => ({ x: bulat(r.x * sx), y: bulat(r.y * sy), w: bulat(r.w * sx), h: bulat(r.h * sy) });
    return {
      ...pg,
      w: baru.w,
      h: baru.h,
      panels: pg.panels.map((p) => ({
        ...p,
        ...rect(p),
        ...(p.corners ? { corners: p.corners.map((c) => ({ x: bulat(c.x * sx), y: bulat(c.y * sy) })) } : {}),
        // gambar yang diatur guru: pusatnya ikut bergeser seperti panel, ukurannya berubah seragam agar tidak gepeng
        ...(p.imageRect
          ? {
              imageRect: {
                x: bulat((p.imageRect.x + p.imageRect.w / 2) * sx - (p.imageRect.w * s) / 2),
                y: bulat((p.imageRect.y + p.imageRect.h / 2) * sy - (p.imageRect.h * s) / 2),
                w: bulat(p.imageRect.w * s),
                h: bulat(p.imageRect.h * s),
              },
            }
          : {}),
      })),
      bubbles: pg.bubbles.map((b) => ({
        ...b,
        x: bulat(b.x * sx),
        y: bulat(b.y * sy),
        w: Math.max(40, bulat(b.w * s)),
        h: Math.max(30, bulat(b.h * s)),
        fontSize: Math.max(10, bulat(b.fontSize * s)),
        tail: b.tail ? { ...b.tail, dx: bulat(b.tail.dx * s), dy: bulat(b.tail.dy * s) } : b.tail,
      })),
      elements: pg.elements.map((e) => ({
        ...e,
        x: bulat(e.x * sx),
        y: bulat(e.y * sy),
        w: Math.max(20, bulat(e.w * s)),
        h: Math.max(20, bulat(e.h * s)),
      })),
    };
  });
}
