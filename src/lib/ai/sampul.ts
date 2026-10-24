import type { ComicInput, Outline, Script } from "./schemas";

type Halaman = Script["halaman"][number];

/** Layout satu panel penuh: sampul selalu satu ilustrasi poster. */
export const LAYOUT_SAMPUL = "1-penuh";

/**
 * Komposisi sampul untuk prompt gambar. Judul ditambahkan guru di editor (teks bergaya), bukan digambar AI, jadi bagian
 * atas dikosongkan untuk judul dan tokoh utama ditaruh besar di bawahnya seperti poster.
 */
export function komposisiSampul(bingkai = "bingkai"): string {
  return (
    `SAMPUL KOMIK (poster, bukan adegan cerita): komposisi vertikal yang menarik dan penuh warna. Kosongkan sekitar 30% bagian ATAS ${bingkai} ` +
    "untuk judul (yang ditambahkan nanti): hanya langit, latar polos, atau pola sederhana tanpa wajah dan benda penting. " +
    `Tokoh utama berada di tengah sampai bawah ${bingkai}, besar, seluruh badan atau setengah badan, berpose ceria menghadap penonton, ` +
    "dengan satu atau dua benda yang melambangkan topik pelajaran. Tanpa balon dialog. "
  );
}

/** Adegan sampul bila AI tidak menuliskannya: tokoh utama dan simbol topik di latar yang sesuai. */
function adeganBawaan(input: Pick<ComicInput, "topik">, judul: string): string {
  return `Ilustrasi sampul komik berjudul "${judul}" tentang ${input.topik}: tokoh-tokoh utama berpose ceria bersama benda yang melambangkan topik, latar cerah yang sesuai dengan cerita.`;
}

/** Pastikan adegan sampul tidak meminta teks atau angka di gambar (judul dibuat di editor). */
const tanpaTeks = (a: string) => a.replace(/\s+/g, " ").trim();

/**
 * Tambahkan halaman sampul di awal naskah (urutan 1) dan geser halaman isi satu nomor. Sampul hanya satu panel penuh tanpa dialog.
 * Adegannya dari `outline.sampul` (ditulis AI bersama outline), atau adegan bawaan bila kosong. Tokoh utama (nama dari guru) dicantumkan
 * agar gambarnya memakai potret masing-masing.
 */
export function tambahSampul(script: Script, outline: Pick<Outline, "judul" | "sampul">, input: Pick<ComicInput, "topik" | "tokoh">): Script {
  const adegan = tanpaTeks(outline.sampul?.adegan ?? "") || adeganBawaan(input, outline.judul);
  const sampul: Halaman = {
    urutan: 1,
    sampul: true,
    layout: LAYOUT_SAMPUL,
    panel: [{ urutan: 1, adegan, karakter: (input.tokoh ?? []).map((t) => t.nama).slice(0, 4), dialog: [], hitungan: [] }],
  };
  return { halaman: [sampul, ...[...script.halaman].sort((a, b) => a.urutan - b.urutan).map((h) => ({ ...h, urutan: h.urutan + 1 }))] };
}

/** Halaman ini sampul? */
export const adalahSampul = (h: Pick<Halaman, "sampul">) => h.sampul === true;
