import { z } from "zod";

export const MAX_BALLOON_WORDS = 25;

export const ComicInputSchema = z.object({
  topik: z.string().min(1),
  materi: z.string().optional(),
  jenjang: z.number().int().min(1).max(6),
  mapel: z.string().default("Matematika"),
  tujuan: z.string().optional(),
  /** Alur cerita dari guru; AI mengikutinya bila ada. */
  cerita: z.string().max(15000).optional(),
  /** cerita = `cerita` adalah cerita sumber yang diadaptasi menjadi komik (bukan sekadar arahan alur). */
  sumber: z.enum(["topik", "pdf", "cerita"]).optional(),
  /** Bahasa dialog dan narasi (bawaan indonesia). */
  bahasa: z.enum(["indonesia", "inggris", "daerah"]).optional(),
  /** Id tema pelajaran (lihat klasifikasi.ts), dipakai sebagai petunjuk bagi AI. */
  tema: z.string().max(40).optional(),
  /** Tokoh pilihan guru; naskah wajib memakai nama ini. */
  tokoh: z.array(z.object({ nama: z.string(), peran: z.string(), deskripsi: z.string() })).max(4).optional(),
  jumlahHalaman: z.number().int().min(4).max(12),
  /** Panel per halaman pilihan guru (1 sampai 6). Kosong = AI memilih 2 sampai 4 sesuai isi. */
  panelPerHalaman: z.number().int().min(1).max(6).nullish(),
  /** Batas atas rentang panel per halaman (panelPerHalaman = batas bawah). */
  panelPerHalamanMaks: z.number().int().min(2).max(6).nullish(),
  /** true = AI memilih jumlah halaman (4 sampai 12); jumlahHalaman hanya cadangan. */
  halamanOtomatis: z.boolean().optional(),
  /** Tambahkan halaman sampul di awal naskah (di luar jumlahHalaman). */
  denganSampul: z.boolean().optional(),
});
export type ComicInput = z.infer<typeof ComicInputSchema>;

export const OutlineSchema = z.object({
  judul: z.string(),
  /** Hanya bila komik bersampul: deskripsi visual ilustrasi sampul (tanpa teks apa pun). */
  sampul: z.object({ adegan: z.string() }).optional(),
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

const HalamanSchema = z.object({
  urutan: z.number().int().min(1),
  /** Halaman ini sampul: satu ilustrasi poster dengan ruang untuk judul, tanpa dialog. */
  sampul: z.boolean().optional(),
  panel: z.array(PanelSchema).min(1).max(6),
});

/** Skema keluaran AI (tanpa layout: layout dipilih guru atau otomatis dari jumlah panel). */
export const AIScriptSchema = z.object({ halaman: z.array(HalamanSchema) });

/** Naskah yang disimpan: sama dengan keluaran AI, ditambah pilihan layout per halaman. */
export const ScriptSchema = z.object({
  halaman: z.array(HalamanSchema.extend({ layout: z.string().max(40).optional() })),
});
export type Script = z.infer<typeof ScriptSchema>;

export type Flag = {
  halaman: number;
  panel: number;
  jenis: "hitungan" | "panjang-balon" | "adegan-kosong" | "balon-kosong" | "jumlah-di-gambar";
  alasan: string;
  /** Indeks di panel.hitungan (untuk jenis "hitungan"). */
  hitungan?: number;
  /** Hasil hitungan yang benar menurut mathjs, bila bisa dihitung. */
  seharusnya?: number;
  /** Indeks di panel.dialog (untuk jenis "panjang-balon"). */
  dialog?: number;
};

/** Tanda "jumlah-di-gambar" hanya peringatan; tanda lain harus diperbaiki sebelum naskah disetujui. */
export const flagMemblokir = (f: Flag) => f.jenis !== "jumlah-di-gambar";
