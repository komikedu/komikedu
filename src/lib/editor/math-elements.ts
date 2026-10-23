import type { ElemenKumpulan, IkonBenda } from "./types";

/** Ikon benda untuk elemen "Kumpulan benda". Digambar sebagai vektor, jadi jumlahnya selalu tepat. */
export const IKON_BENDA: { id: IkonBenda; nama: string }[] = [
  { id: "apel", nama: "Apel" },
  { id: "jeruk", nama: "Jeruk" },
  { id: "kue", nama: "Kue" },
  { id: "bintang", nama: "Bintang" },
  { id: "kelereng", nama: "Kelereng" },
  { id: "pensil", nama: "Pensil" },
];

export const MAX_JUMLAH = 100;
export const MAX_KOLOM = 20;

export const namaIkon = (id: IkonBenda) => IKON_BENDA.find((i) => i.id === id)?.nama.toLowerCase() ?? id;

/**
 * Posisi setiap ikon di dalam elemen (relatif terhadap pojok kiri-atas elemen), disusun per baris.
 * Ukuran sel menyesuaikan kotak elemen agar semua ikon muat; susunan berada di tengah kotak.
 */
export function layoutKumpulan(el: Pick<ElemenKumpulan, "w" | "h" | "jumlah" | "kolom">): { x: number; y: number; size: number }[] {
  const jumlah = Math.max(0, Math.min(MAX_JUMLAH, Math.floor(el.jumlah)));
  const kolom = Math.max(1, Math.min(MAX_KOLOM, Math.floor(el.kolom), jumlah || 1));
  const baris = Math.max(1, Math.ceil(jumlah / kolom));
  const cell = Math.min(el.w / kolom, el.h / baris);
  const ox = (el.w - cell * kolom) / 2;
  const oy = (el.h - cell * baris) / 2;
  return Array.from({ length: jumlah }, (_, i) => ({
    x: ox + (i % kolom) * cell,
    y: oy + Math.floor(i / kolom) * cell,
    size: cell,
  }));
}
