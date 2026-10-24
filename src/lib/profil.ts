import { z } from "zod";

export const PERAN = [
  { id: "guru", nama: "Guru", keterangan: "Membuat komik untuk mengajar di kelas" },
  { id: "kreator", nama: "Kreator konten", keterangan: "Membuat materi belajar untuk dibagikan" },
  { id: "penerbit", nama: "Penerbit", keterangan: "Menerbitkan komik edukasi" },
] as const;

export const MAKS_NAMA = 60;
export const MAKS_SEKOLAH = 100;

/** Rapikan isian teks: buang karakter kontrol, ratakan spasi, dan potong di ujung. */
export const rapikan = (t: string) => t.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();

/** Isian profil dari formulir. Nama wajib; peran dan sekolah boleh kosong (disimpan null). */
export const ProfilSchema = z.object({
  nama: z
    .string()
    .transform(rapikan)
    .pipe(z.string().min(1, "Nama tidak boleh kosong").max(MAKS_NAMA, `Nama maksimal ${MAKS_NAMA} karakter`)),
  peran: z
    .string()
    .nullish()
    .transform((p) => p || null)
    .pipe(z.enum(["guru", "kreator", "penerbit"]).nullable()),
  sekolah: z
    .string()
    .nullish()
    .transform((s) => rapikan(s ?? "") || null)
    .pipe(z.string().max(MAKS_SEKOLAH, `Nama sekolah maksimal ${MAKS_SEKOLAH} karakter`).nullable()),
});

export type Profil = z.infer<typeof ProfilSchema>;
