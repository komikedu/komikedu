import { z } from "zod";
import { galatUkuran } from "@/lib/editor/ukuran-halaman";
import { BAHASA_IDS, TEMA_IDS } from "./klasifikasi";
import { MAX_TOKOH, TokohSchema } from "./tokoh";

export const GAYA = [
  {
    id: "kartun-cerah",
    nama: "Kartun cerah",
    deskripsi: "Bentuk bulat, garis lembut, warna hangat",
    gambar: "/gaya/kartun-cerah.webp",
    // dibedakan dari Kartun sitkom (garis hitam tebal, warna datar): di sini garis tipis berwarna dan pewarnaan lembut dua nada.
    // Istilah gaya berbahasa Inggris dipertahankan karena model gambar lebih andal membacanya.
    prompt:
      "ilustrasi buku cerita anak yang lembut dan ramah (soft friendly children's picture-book cartoon), bentuk tubuh dan kepala membulat dengan proporsi imut, " +
      "garis tepi tipis berwarna cokelat tua yang senada dengan warnanya (thin soft brown outlines, no thick black lines), " +
      "pewarnaan dua nada dengan bayangan lembut dan gradasi halus, warna pastel cerah yang hangat, pencahayaan cerah, wajah ceria",
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
  {
    id: "kartun-sitkom",
    nama: "Kartun sitkom",
    deskripsi: "Garis tebal, warna datar, ekspresif",
    gambar: "/gaya/kartun-sitkom.webp",
    // kata kunci Inggris dipertahankan: model gambar lebih andal membaca istilah gaya dalam bahasa Inggris
    prompt:
      "kartun vektor datar 2D bergaya serial animasi sitkom (flat vector cartoon, sitcom animation style), garis tepi hitam tebal dan seragam, " +
      "warna datar tanpa gradasi, bayangan hanya satu nada tipis, ekspresi karikatur yang dilebih-lebihkan, mata bulat dengan pupil kecil, tampilan vektor bersih",
  },
  {
    id: "chibi-petualangan",
    nama: "Chibi petualangan",
    deskripsi: "Anime imut, warna cerah, latar fantasi",
    gambar: "/gaya/chibi-petualangan.webp",
    prompt:
      "anime chibi imut berproporsi semi-chibi (cute chibi anime style, semi-chibi proportions), mata besar ekspresif, " +
      "wajah ceria dan ramah, pewarnaan cel-shaded dengan bayangan 1 sampai 2 nada, " +
      "warna jenuh yang cerah (vibrant saturated colors), garis tepi bersih, kilau mengkilap (glossy highlights), " +
      "latar fantasi yang rimbun dan penuh warna (lush colorful fantasy meadow background), ilustrasi game edukasi, kawaii",
  },
  {
    id: "faceless",
    nama: "Faceless",
    deskripsi: "Tokoh tanpa wajah, bentuk sederhana, warna datar",
    gambar: "/gaya/faceless.webp",
    // Inggris dipertahankan untuk istilah gaya, dan larangan wajah diulang dengan beberapa kata supaya model tidak menggambar mata atau mulut
    prompt:
      "ilustrasi vektor datar minimalis bergaya komik faceless (minimalist flat vector faceless comic style), " +
      "tokoh TANPA WAJAH: kepala berupa bentuk bulat polos tanpa mata, tanpa hidung, tanpa mulut, tanpa alis (smooth blank featureless face, no eyes, no nose, no mouth), " +
      "tokoh dibedakan lewat rambut, pakaian, aksesori, dan warna kulit, emosi ditunjukkan lewat bahasa tubuh dan posisi tangan, " +
      "bentuk tubuh sederhana membulat, garis tepi bersih dan tipis, warna datar tanpa gradasi dengan palet terbatas, latar sederhana",
  },
  {
    id: "komik-hitam-putih",
    nama: "Komik hitam putih",
    deskripsi: "Tinta hitam, arsiran abu-abu ala manga",
    gambar: "/gaya/komik-hitam-putih.webp",
    // Inggris dipertahankan untuk istilah gaya; larangan warna diulang agar model tidak mewarnai gambar
    prompt:
      "komik strip hitam putih bergaya manga kartun (black and white manga-style comic strip), hanya hitam, putih, dan abu-abu tanpa warna lain (pure grayscale, no color), " +
      "tinta hitam pekat dengan garis tepi tebal dan tegas (bold black ink outlines), kontras tinggi, " +
      "bayangan dan nada abu-abu dengan arsiran screentone titik halftone (gray screentone shading, halftone dots), " +
      "tokoh kartun semi-realistis berproporsi manga dengan mata besar ekspresif dan rambut hitam solid berkilau, ekspresi wajah dan gerak tubuh yang hidup, " +
      "garis kecepatan dan tanda emosi (speed lines, emotion marks), latar digambar detail dengan garis rapi",
  },
] as const;

export const MAX_CERITA = 2000;
/** Cerita sumber yang ditempel guru untuk diadaptasi menjadi komik (jauh lebih panjang dari arahan alur). */
export const MAX_CERITA_SUMBER = 15000;
/** Cerita sumber terlalu pendek untuk dijadikan komik. */
export const MIN_CERITA_SUMBER = 100;

/** Dari mana komik dibuat. */
export const SUMBER = ["topik", "pdf", "cerita"] as const;
export type Sumber = (typeof SUMBER)[number];
export const WIZARD_STEPS = 6;
/** Langkah tempat guru menulis cerita dan membuat naskah (langkah terakhir). */
export const LANGKAH_CERITA = 6;

export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_PDF_PAGES = 30;

/** Kolom draft yang boleh diubah dari wizard. user_id dan status tidak pernah dari klien. */
export const DraftSchema = z.object({
  judul: z.string().trim().min(1).max(120),
  topik: z.string().trim().max(500).nullable(),
  jenjang: z.number().int().min(1).max(6),
  tujuan: z.string().trim().max(500).nullable(),
  jumlah_halaman: z.number().int().min(4).max(12),
  /** true = AI memilih jumlah halaman (4 sampai 12) sesuai panjang cerita; jumlah_halaman hanya cadangan. */
  halaman_otomatis: z.boolean(),
  /** Tambahkan halaman sampul di awal komik (di luar jumlah_halaman). */
  dengan_sampul: z.boolean(),
  /** Panel per halaman (1 sampai 6). null = otomatis: AI memilih 2 sampai 4 sesuai isi halaman. */
  panel_per_halaman: z.number().int().min(1).max(6).nullable(),
  /** Batas atas rentang panel per halaman; bersama panel_per_halaman (batas bawah). null = jumlah tetap atau otomatis. */
  panel_per_halaman_maks: z.number().int().min(2).max(6).nullable(),
  gaya: z.enum(["kartun-cerah", "anime-lembut", "buku-cerita", "kartun-sitkom", "chibi-petualangan", "faceless", "komik-hitam-putih"]).nullable(),
  /** Ukuran kanvas halaman (unit editor); batasnya diperiksa galatUkuran di DraftPatchSchema. */
  lebar_halaman: z.number().int(),
  tinggi_halaman: z.number().int(),
  /** Alur cerita yang ditulis guru (opsional). Kosong = AI yang menentukan cerita. */
  cerita: z.string().trim().max(MAX_CERITA_SUMBER).nullable(),
  /** topik = tulis topik, pdf = unggah materi, cerita = tempel cerita yang sudah ada (kolom cerita berisi cerita sumber). */
  sumber: z.enum(SUMBER),
  /** Tema pelajaran (kategori di galeri komunitas); kosong = belum dipilih. */
  tema: z.enum(TEMA_IDS).nullable(),
  /** Bahasa dialog dan narasi (juga kategori di galeri komunitas). */
  bahasa: z.enum(BAHASA_IDS),
  /** Tokoh pilihan guru (preset atau buatan sendiri). Kosong = AI yang menentukan tokoh. */
  tokoh_json: z.array(TokohSchema).max(MAX_TOKOH),
  wizard_step: z.number().int().min(1).max(WIZARD_STEPS),
});
export type Draft = z.infer<typeof DraftSchema>;

export const DraftPatchSchema = DraftSchema.partial().superRefine((d, ctx) => {
  if (d.lebar_halaman === undefined && d.tinggi_halaman === undefined) return;
  const galat = galatUkuran({ w: d.lebar_halaman, h: d.tinggi_halaman });
  if (galat) ctx.addIssue({ code: "custom", message: galat, path: ["lebar_halaman"] });
});
export type DraftPatch = z.infer<typeof DraftPatchSchema>;

/** Syarat minimal agar draft siap dilanjutkan ke pembuatan outline. */
export function draftErrors(d: Pick<Draft, "topik" | "gaya"> & { sumber?: Sumber; cerita?: string | null }, adaMateri: boolean): string[] {
  const errors: string[] = [];
  if (d.sumber === "cerita") {
    const n = d.cerita?.trim().length ?? 0;
    if (n < MIN_CERITA_SUMBER) errors.push(`Tempel ceritanya dulu (minimal ${MIN_CERITA_SUMBER} karakter).`);
  } else if (!d.topik?.trim() && !adaMateri) errors.push("Isi topik atau unggah PDF materi.");
  if (!d.gaya) errors.push("Pilih gaya visual.");
  return errors;
}
