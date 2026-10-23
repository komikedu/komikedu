import { panelCorners } from "./panel-ops";
import type { Panel, Point } from "./types";

/** Seret dan lepas (atau tempel) gambar ke panel: logika murni untuk memilih panel sasaran dan berkas yang diterima. */

export const TIPE_GAMBAR = ["image/png", "image/jpeg", "image/webp"] as const;
/** Sama dengan batas di server (unggah-panel). */
export const MAX_BYTES_LEPAS = 8 * 1024 * 1024;

/** Titik di dalam poligon (sinar ke kanan). Titik tepat di tepi dianggap di dalam. */
export function titikDalamPoligon(p: Point, poly: Point[]): boolean {
  let dalam = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    // di tepi (segaris dan di antara kedua ujung)
    const silang = (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
    if (Math.abs(silang) < 1e-9 && p.x >= Math.min(a.x, b.x) && p.x <= Math.max(a.x, b.x) && p.y >= Math.min(a.y, b.y) && p.y <= Math.max(a.y, b.y)) return true;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) dalam = !dalam;
  }
  return dalam;
}

/** Panel yang terlihat di titik halaman itu. Panel yang digambar belakangan berada di atas, jadi dicari dari belakang. */
export function panelDiTitik(panels: Panel[], titik: Point): Panel | null {
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (p.visible && titikDalamPoligon(titik, panelCorners(p))) return p;
  }
  return null;
}

export type BerkasGambar = { name: string; type: string; size: number };

/** Apakah seretan membawa berkas (isi dan tipenya baru bisa dibaca saat dilepas). */
export const seretanBerkas = (types: readonly string[] | undefined) => !!types && Array.from(types).includes("Files");

export type PilihanBerkas<T extends BerkasGambar> = { berkas: T[]; ditolak: number; pesan: string | null };

/**
 * Pilih berkas gambar yang boleh dipasang. Berkas yang bukan JPG, PNG, atau WebP, atau lebih dari 8 MB, ditolak. Paling banyak
 * `maks` berkas diterima (sebanyak panel yang tersedia); sisanya diabaikan dan dilaporkan di pesan.
 */
export function pilihBerkasGambar<T extends BerkasGambar>(semua: T[], maks: number): PilihanBerkas<T> {
  const cocok = semua.filter((f) => (TIPE_GAMBAR as readonly string[]).includes(f.type) && f.size > 0 && f.size <= MAX_BYTES_LEPAS);
  const berkas = cocok.slice(0, Math.max(0, maks));
  const ditolak = semua.length - cocok.length;
  const kelebihan = cocok.length - berkas.length;
  if (!semua.length) return { berkas, ditolak, pesan: "Tidak ada berkas gambar." };
  if (!berkas.length) return { berkas, ditolak, pesan: "Hanya gambar JPG, PNG, atau WebP sampai 8 MB yang bisa dipasang." };
  const catatan: string[] = [];
  if (ditolak) catatan.push(`${ditolak} berkas dilewati (bukan JPG, PNG, atau WebP, atau lebih dari 8 MB)`);
  if (kelebihan) catatan.push(`${kelebihan} berkas dilewati karena panel tidak cukup`);
  return { berkas, ditolak, pesan: catatan.length ? `${catatan.join("; ")}.` : null };
}

/**
 * Panel tujuan untuk beberapa berkas: mulai dari panel yang dituju, lalu panel berikutnya menurut urutan baca
 * (urutan di daftar panel halaman). Panel yang disembunyikan dilewati.
 */
export function panelTujuan(panels: Panel[], mulaiId: string, jumlah: number): Panel[] {
  const terlihat = panels.filter((p) => p.visible);
  const awal = terlihat.findIndex((p) => p.id === mulaiId);
  return awal < 0 ? [] : terlihat.slice(awal, awal + jumlah);
}
