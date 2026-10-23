import { z } from "zod";

export const MAX_DESKRIPSI = 300;
export const MAX_CATATAN_LAPORAN = 500;
export const PER_HALAMAN_KOMUNITAS = 24;
/** Jumlah halaman maksimum satu komik (sama dengan batas editor). */
export const MAX_HALAMAN_PUBLIK = 30;

/** Alasan melapor komik. `id` disimpan di database (comic_reports.alasan). */
export const ALASAN_LAPORAN = [
  { id: "tidak-pantas", label: "Konten tidak pantas untuk anak" },
  { id: "hak-cipta", label: "Melanggar hak cipta" },
  { id: "salah", label: "Informasi atau hitungan salah" },
  { id: "spam", label: "Spam atau tidak relevan" },
  { id: "lainnya", label: "Lainnya" },
] as const;
export type AlasanLaporan = (typeof ALASAN_LAPORAN)[number]["id"];

const alasanIds = ALASAN_LAPORAN.map((a) => a.id) as [AlasanLaporan, ...AlasanLaporan[]];

/** Pernyataan wajib dicentang sebelum menerbitkan. Tanpa itu, komik tidak boleh terbit. */
export const TerbitSchema = z.object({
  deskripsi: z.string().trim().max(MAX_DESKRIPSI, `Deskripsi maksimal ${MAX_DESKRIPSI} karakter`).default(""),
  setuju: z.literal(true, { error: "Centang pernyataan hak cipta dan kelayakan konten dulu" }),
  /** id penerbitan: halaman salinan sudah diunggah dengan id ini sebelum memanggil terbit */
  rilis: z.string().uuid({ error: "Permintaan tidak valid" }),
  jumlah: z.number().int().min(1, "Komik belum punya halaman").max(MAX_HALAMAN_PUBLIK),
});
export type TerbitInput = z.input<typeof TerbitSchema>;

export const PerbaruiDeskripsiSchema = z.object({
  deskripsi: z.string().trim().max(MAX_DESKRIPSI, `Deskripsi maksimal ${MAX_DESKRIPSI} karakter`),
});

export const LaporSchema = z.object({
  alasan: z.enum(alasanIds, { error: "Pilih alasan laporan" }),
  catatan: z
    .string()
    .trim()
    .max(MAX_CATATAN_LAPORAN, `Catatan maksimal ${MAX_CATATAN_LAPORAN} karakter`)
    .optional()
    .transform((c) => (c ? c : null)),
});

/** Komik hanya boleh terbit bila minimal satu panel punya gambar (tidak menerbitkan komik kosong). */
export function adaGambarUntukTerbit(panels: { image_url: string | null; tampil?: boolean | null }[]): boolean {
  return panels.some((p) => !!p.image_url && p.tampil !== false);
}

/** Nomor halaman dari query string: bilangan bulat >= 1, selain itu 1. */
export function nomorHalaman(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : 1;
}
