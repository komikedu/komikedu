/** Pengelompokan komik di galeri komunitas: jenjang (kelas SD), tema, dan bahasa. Dipakai filter dan dialog terbit. */

export const TEMA = [
  { id: "bilangan", nama: "Bilangan dan operasi hitung" },
  { id: "pecahan", nama: "Pecahan dan desimal" },
  { id: "geometri", nama: "Bangun datar dan bangun ruang" },
  { id: "pengukuran", nama: "Pengukuran" },
  { id: "waktu", nama: "Waktu dan jam" },
  { id: "data", nama: "Data dan statistik" },
  { id: "cerita-soal", nama: "Soal cerita" },
  { id: "lainnya", nama: "Lainnya" },
] as const;
export type TemaId = (typeof TEMA)[number]["id"];

export const BAHASA = [
  { id: "indonesia", nama: "Indonesia" },
  { id: "inggris", nama: "Inggris" },
  { id: "daerah", nama: "Daerah" },
] as const;
export type BahasaId = (typeof BAHASA)[number]["id"];

export const JENJANG_KELAS = [1, 2, 3, 4, 5, 6] as const;

export const TEMA_IDS = TEMA.map((t) => t.id) as [TemaId, ...TemaId[]];
export const BAHASA_IDS = BAHASA.map((b) => b.id) as [BahasaId, ...BahasaId[]];

export const namaTema = (id: string | null | undefined) => TEMA.find((t) => t.id === id)?.nama ?? null;
export const namaBahasa = (id: string | null | undefined) => BAHASA.find((b) => b.id === id)?.nama ?? null;

/** Filter galeri komunitas; kosong berarti semua. */
export type FilterKomunitas = { jenjang?: number; tema?: TemaId; bahasa?: BahasaId };

const satu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Filter dari query string. Nilai yang tidak dikenal diabaikan (tidak menyaring), bukan menghasilkan galat. */
export function bacaFilter(q: { jenjang?: string | string[]; tema?: string | string[]; bahasa?: string | string[] }): FilterKomunitas {
  const jenjang = Number(satu(q.jenjang));
  const tema = satu(q.tema);
  const bahasa = satu(q.bahasa);
  return {
    ...((JENJANG_KELAS as readonly number[]).includes(jenjang) ? { jenjang } : {}),
    ...(TEMA.some((t) => t.id === tema) ? { tema: tema as TemaId } : {}),
    ...(BAHASA.some((b) => b.id === bahasa) ? { bahasa: bahasa as BahasaId } : {}),
  };
}

export const adaFilter = (f: FilterKomunitas) => f.jenjang !== undefined || f.tema !== undefined || f.bahasa !== undefined;

/** Alamat galeri komunitas untuk filter dan nomor halaman tertentu (halaman 1 tidak ditulis). */
export function urlKomunitas(f: FilterKomunitas, halaman = 1): string {
  const p = new URLSearchParams();
  if (f.jenjang !== undefined) p.set("jenjang", String(f.jenjang));
  if (f.tema) p.set("tema", f.tema);
  if (f.bahasa) p.set("bahasa", f.bahasa);
  if (halaman > 1) p.set("halaman", String(halaman));
  const s = p.toString();
  return s ? `/komunitas?${s}` : "/komunitas";
}
