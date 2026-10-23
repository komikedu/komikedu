import { z } from "zod";

export type GayaId = "kartun-cerah" | "anime-lembut" | "buku-cerita" | "kartun-sitkom";

export type TokohPreset = {
  id: string;
  nama: string;
  peran: string;
  /** Deskripsi visual tetap; dipakai di prompt naskah dan gambar agar tokoh selalu sama. */
  deskripsi: string;
};

export const MAX_TOKOH = 8;

/** Tokoh siap pakai (PRD: guru, siswa, maskot). Potret per gaya ada di /public/tokoh/{id}-{gaya}.webp. */
export const TOKOH_PRESET: TokohPreset[] = [
  {
    id: "doni",
    nama: "Doni",
    peran: "Siswa",
    deskripsi: "anak laki-laki 10 tahun, rambut hitam pendek rapi, kulit sawo matang, seragam SD putih-merah dengan dasi merah, tas punggung biru",
  },
  {
    id: "sari",
    nama: "Sari",
    peran: "Siswa",
    deskripsi: "anak perempuan 10 tahun berkerudung putih, wajah bulat ceria, kulit sawo matang, seragam SD putih-merah dengan rok merah panjang, tas punggung merah",
  },
  {
    id: "kiki",
    nama: "Kiki",
    peran: "Siswa",
    deskripsi: "anak perempuan 9 tahun, rambut hitam dikuncir dua dengan poni, kulit kuning langsat, seragam SD putih-merah dengan rok merah, tas punggung kuning",
  },
  {
    id: "bima",
    nama: "Bima",
    peran: "Siswa",
    deskripsi: "anak laki-laki 11 tahun, rambut hitam ikal, kacamata bulat, kulit cokelat, seragam SD putih-merah, jam tangan hijau",
  },
  {
    id: "bu-rina",
    nama: "Bu Rina",
    peran: "Guru",
    deskripsi: "guru perempuan sekitar 35 tahun, kerudung biru muda, kemeja batik biru, rok panjang gelap, wajah ramah, sering memegang buku",
  },
  {
    id: "pak-budi",
    nama: "Pak Budi",
    peran: "Guru",
    deskripsi: "guru laki-laki sekitar 40 tahun, rambut hitam pendek, kumis tipis, kemeja putih lengan panjang, celana panjang gelap, wajah sabar",
  },
  {
    id: "pintar",
    nama: "Pintar",
    peran: "Maskot",
    deskripsi: "maskot burung hantu kecil berbulu cokelat muda, mata besar, kacamata bulat kecil, topi wisuda biru",
  },
];

export const gambarTokoh = (id: string, gaya: string | null) => `/tokoh/${id}-${gaya ?? "kartun-cerah"}.webp`;

/** Tokoh yang dipilih di komik: preset (punya potret) atau buatan guru (deskripsi saja). */
export const TokohSchema = z.object({
  id: z.string().min(1).max(40),
  nama: z.string().trim().min(1).max(40),
  peran: z.string().trim().max(40).default(""),
  deskripsi: z.string().trim().min(1).max(300),
  preset: z.boolean(),
  /** URL potret buatan AI (bucket panels) untuk tokoh buatan sendiri; server hanya memakai URL milik komik ini */
  potret: z.string().url().max(500).optional(),
  /** URL gambar badan penuh (buatan AI atau unggahan guru); aturan keamanannya sama dengan potret */
  badan: z.string().url().max(500).optional(),
});
export type Tokoh = z.infer<typeof TokohSchema>;

export const fromPreset = (p: TokohPreset): Tokoh => ({ id: p.id, nama: p.nama, peran: p.peran, deskripsi: p.deskripsi, preset: true });

/** Preset yang terdaftar saja; tokoh buatan guru tidak punya potret. */
export const isPresetId = (id: string) => TOKOH_PRESET.some((p) => p.id === id);

/**
 * Apakah lembar karakter tersimpan masih sesuai tokoh pilihan guru (nama dan deskripsi sama persis).
 * Bila tidak, lembar karakter harus disusun ulang dan referensi halaman lama tidak boleh dipakai lagi.
 */
export function sheetCocok(sheet: { nama: string; deskripsi: string }[], tokoh: Pick<Tokoh, "nama" | "deskripsi">[]): boolean {
  return tokoh.every((t) => sheet.some((k) => k.nama === t.nama && k.deskripsi === t.deskripsi));
}

export type GantiNama = { lama: string; baru: string };
export const GantiNamaSchema = z.object({ lama: z.string().trim().min(1).max(40), baru: z.string().trim().min(1).max(40) });

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Ganti nama tokoh sebagai kata utuh (tidak menyentuh "Doniyah" saat mengganti "Doni"), tanpa peduli huruf besar-kecil. */
export function gantiNamaDiTeks(teks: string, ganti: GantiNama[]): string {
  return ganti.reduce(
    (t, g) => (g.lama === g.baru ? t : t.replace(new RegExp(`(?<![\\p{L}\\d])${escapeRe(g.lama)}(?![\\p{L}\\d])`, "giu"), g.baru)),
    teks,
  );
}

type ScriptPanel = { adegan?: string; karakter?: string[]; dialog?: { karakter: string; teks?: string }[] };

/** Ganti nama tokoh di script panel naskah: daftar karakter, pembicara balon, adegan, dan teks dialog. */
export function gantiNamaDiScript<T extends ScriptPanel>(sp: T, ganti: GantiNama[]): T {
  const nama = (n: string) => ganti.find((g) => g.lama.toLowerCase() === n.trim().toLowerCase())?.baru ?? n;
  return {
    ...sp,
    ...(sp.adegan !== undefined ? { adegan: gantiNamaDiTeks(sp.adegan, ganti) } : {}),
    ...(sp.karakter ? { karakter: sp.karakter.map(nama) } : {}),
    ...(sp.dialog
      ? { dialog: sp.dialog.map((d) => ({ ...d, karakter: nama(d.karakter), ...(d.teks !== undefined ? { teks: gantiNamaDiTeks(d.teks, ganti) } : {}) })) }
      : {}),
  };
}

type Sheet = { nama: string; deskripsi: string }[];

/**
 * Tokoh di naskah yang belum ada di daftar tokoh (mis. "Siti") ditambahkan dari lembar karakter,
 * sampai MAX_TOKOH. Nama yang sama dengan tokoh siap pakai memakai preset itu (punya potret).
 * Lembar karakter ikut diselaraskan agar `sheetCocok` tetap benar dan halaman lama tetap jadi referensi.
 */
export function tambahTokohDariSheet(tokoh: Tokoh[], sheet: Sheet): { tokoh: Tokoh[]; sheet: Sheet } {
  const hasil = [...tokoh];
  const ada = (nama: string) => hasil.some((t) => t.nama.toLowerCase() === nama.toLowerCase());
  const sheetBaru = sheet.map((k) => {
    const nama = k.nama.trim().slice(0, 40);
    if (!nama || ada(nama)) return k;
    const preset = TOKOH_PRESET.find((p) => p.nama.toLowerCase() === nama.toLowerCase());
    const deskripsi = (preset?.deskripsi ?? k.deskripsi).trim().slice(0, 300);
    if (!deskripsi || hasil.length >= MAX_TOKOH) return k;
    hasil.push(preset ? fromPreset(preset) : { id: `naskah-${crypto.randomUUID().slice(0, 8)}`, nama, peran: "", deskripsi, preset: false });
    return { nama: preset?.nama ?? nama, deskripsi };
  });
  return { tokoh: hasil, sheet: sheetBaru };
}
