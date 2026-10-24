import type { EditorPage } from "./types";

/**
 * Memasangkan banyak gambar (mis. unduhan Google Flow) ke panel komik. Berkas bernama seperti "1-1.png" (halaman 1, panel 1),
 * "2_3", "h2p3", atau "Halaman 2 Panel 3" dipasang sesuai nomornya. Berkas lain mengisi panel yang masih kosong secara berurutan
 * menurut nama (urutan alami: 2 sebelum 10). Hasilnya hanya usulan; guru bisa mengubahnya sebelum dipasang.
 */

export type TujuanPanel = { pageId: string; panelId: string; halaman: number; panel: number };

export type UsulanPasang = {
  berkas: { name: string; waktu?: number };
  /** asal usulan: dari nomor di nama berkas, dari urutan panel kosong, atau tidak ada */
  sumber: "nama" | "urutan" | "tidak-ada";
  tujuan: TujuanPanel | null;
  /** keterangan bila tidak bisa dipasang (mis. nomor tidak ada atau bentrok) */
  catatan?: string;
};

const C = String.raw`[\s._-]`; // satu karakter pemisah

/**
 * Nomor halaman dan panel dari nama berkas, atau null. Nama harus diawali nomor (atau "h"/"halaman") dan dua nomor harus dipisah
 * pemisah atau kata "p"/"panel", jadi nama panjang berisi stempel waktu seperti "Boy_..._20261023" tidak ikut terbaca.
 */
export function nomorDariNama(nama: string): { halaman: number; panel: number } | null {
  const tanpaEkstensi = nama.replace(/\.[a-z0-9]{2,5}$/i, "").trim();
  const m = new RegExp(String.raw`^(?:h(?:alaman)?${C}*)?(\d{1,2})(?:${C}+(?:p(?:anel)?${C}*)?|p(?:anel)?${C}*)(\d{1,2})(?!\d)`, "i").exec(tanpaEkstensi);
  if (!m) return null;
  const halaman = Number(m[1]);
  const panel = Number(m[2]);
  return halaman >= 1 && panel >= 1 ? { halaman, panel } : null;
}

/** Pembanding urutan alami: "gambar2" sebelum "gambar10". */
/** Salinan unduhan bernama "1-1 (2).png" kalah dari "1-1.png" bila keduanya bernomor sama. */
const akhiranSalinan = (nama: string) => /\s\(\d+\)(\.[a-z0-9]+)?$/i.test(nama);
const bandingUtama = (a: { name: string }, b: { name: string }) => Number(akhiranSalinan(a.name)) - Number(akhiranSalinan(b.name)) || bandingAlami(a.name, b.name);

export const bandingAlami = (a: string, b: string) => a.localeCompare(b, "id", { numeric: true, sensitivity: "base" });

/** Semua panel terlihat dalam urutan baca (halaman lalu panel), dengan nomor 1-berbasis. */
export function daftarPanel(pages: EditorPage[]): (TujuanPanel & { kosong: boolean })[] {
  return pages.flatMap((pg, hi) => pg.panels.filter((p) => p.visible).map((p, pi) => ({ pageId: pg.id, panelId: p.id, halaman: hi + 1, panel: pi + 1, kosong: !p.imageUrl })));
}

/** Stempel waktu 14 digit (yyyyMMddHHmmss) di nama berkas unduhan Flow, sebagai urutan pembuatan; null bila tidak ada. */
export function waktuDariNama(nama: string): number | null {
  const m = /(?<!\d)(20\d{12})(?!\d)/.exec(nama);
  return m ? Number(m[1]) : null;
}

export type OpsiPasang = {
  /** berkas tanpa nomor diurutkan menurut waktu pembuatan (stempel di nama, atau waktu berkas), bukan menurut nama */
  urutWaktu?: boolean;
  /** id panel tempat berkas tanpa nomor mulai dipasang (panel itu dan sesudahnya, termasuk yang sudah bergambar); kosong = panel kosong saja */
  mulaiDi?: string;
};

type Berkas = { name: string; waktu?: number };

export function usulkanPemasangan(berkas: Berkas[], pages: EditorPage[], opsi: OpsiPasang = {}): UsulanPasang[] {
  const panel = daftarPanel(pages);
  const terpakai = new Set<string>();
  const hasil = new Map<Berkas, UsulanPasang>();

  // 1. berkas bernomor dipasang sesuai nomornya; nomor ganda: yang pertama (menurut urutan nama) menang
  for (const b of [...berkas].sort(bandingUtama)) {
    const no = nomorDariNama(b.name);
    if (!no) continue;
    const t = panel.find((p) => p.halaman === no.halaman && p.panel === no.panel);
    if (!t) hasil.set(b, { berkas: b, sumber: "tidak-ada", tujuan: null, catatan: `Halaman ${no.halaman} panel ${no.panel} tidak ada` });
    else if (terpakai.has(t.panelId)) hasil.set(b, { berkas: b, sumber: "tidak-ada", tujuan: null, catatan: `Bentrok dengan berkas lain untuk halaman ${no.halaman} panel ${no.panel}` });
    else {
      terpakai.add(t.panelId);
      hasil.set(b, { berkas: b, sumber: "nama", tujuan: { pageId: t.pageId, panelId: t.panelId, halaman: t.halaman, panel: t.panel } });
    }
  }

  // 2. sisanya mengisi panel yang belum terpakai (yang kosong, atau mulai dari panel pilihan), berurutan menurut nama atau waktu
  const awal = opsi.mulaiDi ? panel.findIndex((p) => p.panelId === opsi.mulaiDi) : -1;
  const kosong = awal >= 0 ? panel.slice(awal).filter((p) => !terpakai.has(p.panelId)) : panel.filter((p) => p.kosong && !terpakai.has(p.panelId));
  const kunciWaktu = (b: Berkas) => waktuDariNama(b.name) ?? b.waktu ?? 0;
  const urut = opsi.urutWaktu ? (x: Berkas, y: Berkas) => kunciWaktu(x) - kunciWaktu(y) || bandingAlami(x.name, y.name) : (x: Berkas, y: Berkas) => bandingAlami(x.name, y.name);
  let i = 0;
  for (const b of [...berkas].sort(urut)) {
    if (hasil.has(b)) continue;
    const t = kosong[i++];
    hasil.set(b, t ? { berkas: b, sumber: "urutan", tujuan: { pageId: t.pageId, panelId: t.panelId, halaman: t.halaman, panel: t.panel } } : { berkas: b, sumber: "tidak-ada", tujuan: null, catatan: "Tidak ada panel kosong tersisa" });
  }

  // tampilkan menurut urutan panel tujuan, yang tidak punya tujuan di akhir
  return berkas.map((b) => hasil.get(b)!).sort((a, b) => {
    if (a.tujuan && b.tujuan) return a.tujuan.halaman - b.tujuan.halaman || a.tujuan.panel - b.tujuan.panel;
    if (a.tujuan) return -1;
    if (b.tujuan) return 1;
    return bandingAlami(a.berkas.name, b.berkas.name);
  });
}

/** Nama berkas yang disarankan untuk sebuah panel, mis. "1-1". */
export const namaBerkasPanel = (halaman: number, panel: number) => `${halaman}-${panel}`;
