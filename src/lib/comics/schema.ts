import { z } from "zod";
import { MAX_TOKOH, TokohSchema } from "./tokoh";

export const GAYA = [
  {
    id: "kartun-cerah",
    nama: "Kartun cerah",
    deskripsi: "Warna cerah, garis tegas",
    gambar: "/gaya/kartun-cerah.webp",
    prompt: "kartun anak berwarna cerah, garis tepi hitam tegas, warna datar",
  },
  {
    id: "anime-lembut",
    nama: "Anime lembut",
    deskripsi: "Mata besar, warna pastel",
    gambar: "/gaya/anime-lembut.webp",
    prompt: "anime lembut, mata besar, warna pastel, pencahayaan hangat",
  },
  {
    id: "buku-cerita",
    nama: "Buku cerita",
    deskripsi: "Gaya cat air yang hangat",
    gambar: "/gaya/buku-cerita.webp",
    prompt: "ilustrasi buku cerita anak dengan cat air, tekstur kertas, warna hangat",
  },
] as const;

export const MAX_CERITA = 2000;
export const WIZARD_STEPS = 5;
/** Langkah tempat guru menulis cerita dan membuat naskah (langkah terakhir). */
export const LANGKAH_CERITA = 5;

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
  /** Tokoh pilihan guru (preset atau buatan sendiri). Kosong = AI yang menentukan tokoh. */
  tokoh_json: z.array(TokohSchema).max(MAX_TOKOH),
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
