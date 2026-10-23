import { z } from "zod";

export type GayaId = "kartun-cerah" | "anime-lembut" | "buku-cerita";

export type TokohPreset = {
  id: string;
  nama: string;
  peran: string;
  /** Deskripsi visual tetap; dipakai di prompt naskah dan gambar agar tokoh selalu sama. */
  deskripsi: string;
};

export const MAX_TOKOH = 4;

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
});
export type Tokoh = z.infer<typeof TokohSchema>;

export const fromPreset = (p: TokohPreset): Tokoh => ({ id: p.id, nama: p.nama, peran: p.peran, deskripsi: p.deskripsi, preset: true });

/** Preset yang terdaftar saja; tokoh buatan guru tidak punya potret. */
export const isPresetId = (id: string) => TOKOH_PRESET.some((p) => p.id === id);
