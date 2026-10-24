import type { Tokoh } from "@/lib/comics/tokoh";

/** Bagian komik yang memengaruhi isi naskah; perubahan pada salah satunya membuat naskah lama tidak lagi sesuai. */
export type PengaturanNaskah = {
  topik?: string | null;
  tujuan?: string | null;
  cerita?: string | null;
  sumber?: string | null;
  jenjang?: number | null;
  tema?: string | null;
  bahasa?: string | null;
  gaya?: string | null;
  jumlah_halaman?: number | null;
  halaman_otomatis?: boolean | null;
  panel_per_halaman?: number | null;
  panel_per_halaman_maks?: number | null;
  dengan_sampul?: boolean | null;
  tokoh_json?: unknown;
};

/** Hash 53-bit sederhana (cyrb53); cukup untuk membandingkan, bukan untuk keamanan. */
function hash(teks: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < teks.length; i++) {
    const c = teks.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

const teks = (v: string | null | undefined) => (v ?? "").trim();

/** Sidik pengaturan yang memengaruhi naskah. Nilai kosong dan null dianggap sama; urutan tokoh tidak berpengaruh. */
export function sidikPengaturan(p: PengaturanNaskah): string {
  const tokoh = (Array.isArray(p.tokoh_json) ? (p.tokoh_json as Tokoh[]) : [])
    .map((t) => `${teks(t.nama)}|${teks(t.peran)}|${teks(t.deskripsi)}`)
    .sort();
  return hash(
    JSON.stringify([
      teks(p.sumber) || "topik",
      teks(p.topik),
      teks(p.tujuan),
      teks(p.cerita),
      p.jenjang ?? null,
      teks(p.tema),
      teks(p.bahasa) || "indonesia",
      teks(p.gaya),
      p.halaman_otomatis === true ? "otomatis" : (p.jumlah_halaman ?? null),
      p.panel_per_halaman ?? null,
      p.panel_per_halaman_maks ?? null,
      p.dengan_sampul === true,
      tokoh,
    ]),
  );
}

/** Pengaturan berubah sejak naskah ditulis? Naskah lama tanpa sidik tidak ditandai. */
export function pengaturanBerubah(tersimpan: string | null | undefined, sekarang: PengaturanNaskah): boolean {
  return !!tersimpan && tersimpan !== sidikPengaturan(sekarang);
}
