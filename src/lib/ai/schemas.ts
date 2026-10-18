import { z } from "zod";

export const MAX_BALLOON_WORDS = 25;

export const ComicInputSchema = z.object({
  topik: z.string().min(1),
  materi: z.string().optional(),
  jenjang: z.number().int().min(1).max(6),
  mapel: z.string().default("Matematika"),
  tujuan: z.string().optional(),
  jumlahHalaman: z.number().int().min(4).max(12),
});
export type ComicInput = z.infer<typeof ComicInputSchema>;

export const OutlineSchema = z.object({
  judul: z.string(),
  halaman: z.array(
    z.object({
      urutan: z.number().int().min(1),
      ringkasan: z.string(),
      konsep: z.array(z.string()),
    }),
  ),
});
export type Outline = z.infer<typeof OutlineSchema>;

export const DialogSchema = z.object({
  karakter: z.string(),
  jenis: z.enum(["bicara", "pikir", "narasi"]),
  teks: z.string(),
});

/** Hitungan yang muncul di panel; diverifikasi dengan mathjs, bukan LLM. */
export const CalculationSchema = z.object({
  ekspresi: z.string().describe("Ekspresi mathjs, mis. '3/4 + 1/4' atau 'lcm(4, 6)'"),
  hasilTertulis: z.number().describe("Angka hasil seperti tertulis di dialog/narasi"),
});

export const PanelSchema = z.object({
  urutan: z.number().int().min(1),
  adegan: z.string().describe("Deskripsi visual adegan, TANPA teks atau angka di gambar"),
  karakter: z.array(z.string()),
  dialog: z.array(DialogSchema),
  hitungan: z.array(CalculationSchema),
});

export const ScriptSchema = z.object({
  halaman: z.array(
    z.object({
      urutan: z.number().int().min(1),
      panel: z.array(PanelSchema).min(1).max(6),
    }),
  ),
});
export type Script = z.infer<typeof ScriptSchema>;

export type Flag = {
  halaman: number;
  panel: number;
  jenis: "hitungan" | "panjang-balon";
  alasan: string;
};
