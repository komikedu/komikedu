import { z } from "zod";

export const GAYA = [
  { id: "kartun-cerah", nama: "Kartun cerah", deskripsi: "Warna cerah, garis tegas", gambar: "/gaya/kartun-cerah.webp" },
  { id: "anime-lembut", nama: "Anime lembut", deskripsi: "Mata besar, warna pastel", gambar: "/gaya/anime-lembut.webp" },
  { id: "buku-cerita", nama: "Buku cerita", deskripsi: "Gaya cat air yang hangat", gambar: "/gaya/buku-cerita.webp" },
] as const;

export const MAX_CERITA = 2000;
export const WIZARD_STEPS = 4;

export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_PDF_PAGES = 30;

/** Kolom draft yang boleh diubah dari wizard. user_id dan status tidak pernah dari klien. */
export const DraftSchema = z.object({
  judul: z.string().trim().min(1).max(120),
  topik: z.string().trim().max(500).nullable(),
  jenjang: z.number().int().min(1).max(6),
  tujuan: z.string().trim().max(500).nullable(),
  jumlah_halaman: z.number().int().min(4).max(12),
  gaya: z.enum(["kartun-cerah", "anime-lembut", "buku-cerita"]).nullable(),
  /** Alur cerita yang ditulis guru (opsional). Kosong = AI yang menentukan cerita. */
  cerita: z.string().trim().max(MAX_CERITA).nullable(),
  wizard_step: z.number().int().min(1).max(WIZARD_STEPS),
});
export type Draft = z.infer<typeof DraftSchema>;

export const DraftPatchSchema = DraftSchema.partial();
export type DraftPatch = z.infer<typeof DraftPatchSchema>;

/** Syarat minimal agar draft siap dilanjutkan ke pembuatan outline. */
export function draftErrors(d: Pick<Draft, "topik" | "gaya">, adaMateri: boolean): string[] {
  const errors: string[] = [];
  if (!d.topik?.trim() && !adaMateri) errors.push("Isi topik atau unggah PDF materi.");
  if (!d.gaya) errors.push("Pilih gaya visual.");
  return errors;
}
