import { getLayout, isLayoutId, layoutForPanelCount } from "@/lib/ai/layouts";
import type { Script } from "@/lib/ai/schemas";

/** Format angka gaya Indonesia (koma desimal), tanpa ekor nol yang tidak perlu. */
export function formatAngka(n: number): string {
  const rounded = Math.round(n * 1e9) / 1e9;
  return String(rounded).replace(".", ",");
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Ganti angka utuh `dari` dengan `ke` di teks (tidak menyentuh angka yang lebih panjang, mis. 12 di 120). */
export function gantiAngka(teks: string, dari: number, ke: number): { teks: string; diganti: boolean } {
  const varian = Array.from(new Set([String(dari), formatAngka(dari)]));
  let diganti = false;
  let hasil = teks;
  for (const v of varian) {
    const re = new RegExp(`(?<![\\d.,])${escapeRe(v)}(?![\\d]|[.,]\\d)`, "g");
    hasil = hasil.replace(re, () => {
      diganti = true;
      return formatAngka(ke);
    });
  }
  return { teks: hasil, diganti };
}

/**
 * Terima perbaikan otomatis untuk satu hitungan: ubah hasil tertulis menjadi hasil yang benar,
 * dan ganti angka lama di dialog panel yang sama. `diganti` false berarti angka tidak ditemukan di
 * dialog (mis. ditulis dengan huruf), jadi guru perlu memeriksa teksnya sendiri.
 */
export function terimaPerbaikan(
  script: Script,
  halaman: number,
  panel: number,
  indeks: number,
  seharusnya: number,
): { script: Script; diganti: boolean } {
  const next: Script = structuredClone(script);
  const p = next.halaman.find((h) => h.urutan === halaman)?.panel.find((x) => x.urutan === panel);
  const h = p?.hitungan[indeks];
  if (!p || !h) return { script, diganti: false };

  const lama = h.hasilTertulis;
  h.hasilTertulis = seharusnya;
  let diganti = false;
  for (const d of p.dialog) {
    const r = gantiAngka(d.teks, lama, seharusnya);
    d.teks = r.teks;
    diganti ||= r.diganti;
  }
  return { script: next, diganti };
}

// ---------------------------------------------------------------------------
// Struktur halaman: layout, panel, dan balon. Semua fungsi murni (tidak mengubah argumen).

type Halaman = Script["halaman"][number];
type PanelNaskah = Halaman["panel"][number];

export const MAX_PANEL = 4;
export const MAX_BALON = 6;

const panelKosong = (urutan: number): PanelNaskah => ({ urutan, adegan: "", karakter: [], dialog: [], hitungan: [] });

/** Panel dianggap berisi bila sudah punya adegan, dialog, atau hitungan. */
export const panelBerisi = (p: PanelNaskah) => !!p.adegan.trim() || p.dialog.length > 0 || p.hitungan.length > 0;

/** Layout yang berlaku untuk halaman: pilihan guru bila cocok, kalau tidak default sesuai jumlah panel. */
export function layoutHalaman(h: Pick<Halaman, "layout" | "panel">): string {
  if (isLayoutId(h.layout) && getLayout(h.layout).panels.length === h.panel.length) return h.layout;
  return layoutForPanelCount(h.panel.length).id;
}

function ubahHalaman(script: Script, urutan: number, fn: (h: Halaman) => void): Script {
  const next: Script = structuredClone(script);
  const h = next.halaman.find((x) => x.urutan === urutan);
  if (h) {
    fn(h);
    h.panel = [...h.panel].sort((a, b) => a.urutan - b.urutan).map((p, i) => ({ ...p, urutan: i + 1 }));
  }
  return next;
}

/** Hitung panel berisi yang akan terhapus bila halaman diganti ke layout ini (untuk konfirmasi). */
export function panelTerhapusJikaGantiLayout(h: Halaman, layoutId: string): number {
  const n = getLayout(layoutId).panels.length;
  return [...h.panel].sort((a, b) => a.urutan - b.urutan).slice(n).filter(panelBerisi).length;
}

/** Ganti layout halaman. Jumlah panel menyesuaikan: panel kosong ditambah atau panel terakhir dibuang. */
export function gantiLayout(script: Script, halaman: number, layoutId: string): Script {
  if (!isLayoutId(layoutId)) return script;
  const n = getLayout(layoutId).panels.length;
  return ubahHalaman(script, halaman, (h) => {
    const urut = [...h.panel].sort((a, b) => a.urutan - b.urutan);
    h.panel = urut.length >= n ? urut.slice(0, n) : [...urut, ...Array.from({ length: n - urut.length }, (_, i) => panelKosong(urut.length + i + 1))];
    h.layout = layoutId;
  });
}

/** Tambah satu panel kosong di akhir halaman (maks. 4); layout ikut ke default jumlah baru. */
export function tambahPanel(script: Script, halaman: number): Script {
  const h = script.halaman.find((x) => x.urutan === halaman);
  if (!h || h.panel.length >= MAX_PANEL) return script;
  return ubahHalaman(script, halaman, (x) => {
    x.panel.push(panelKosong(x.panel.length + 1));
    x.layout = layoutForPanelCount(x.panel.length).id;
  });
}

/** Hapus satu panel (minimal tersisa 1); nomor panel diurutkan ulang. */
export function hapusPanel(script: Script, halaman: number, panel: number): Script {
  const h = script.halaman.find((x) => x.urutan === halaman);
  if (!h || h.panel.length <= 1 || !h.panel.some((p) => p.urutan === panel)) return script;
  return ubahHalaman(script, halaman, (x) => {
    x.panel = x.panel.filter((p) => p.urutan !== panel);
    x.layout = layoutForPanelCount(x.panel.length).id;
  });
}

/** Tambah balon kosong di panel (maks. 6). Karakter disalin dari karakter pertama panel bila ada. */
export function tambahBalon(script: Script, halaman: number, panel: number): Script {
  return ubahHalaman(script, halaman, (h) => {
    const p = h.panel.find((x) => x.urutan === panel);
    if (!p || p.dialog.length >= MAX_BALON) return;
    p.dialog.push({ karakter: p.karakter[0] ?? "", jenis: "bicara", teks: "" });
  });
}

export function hapusBalon(script: Script, halaman: number, panel: number, indeks: number): Script {
  return ubahHalaman(script, halaman, (h) => {
    const p = h.panel.find((x) => x.urutan === panel);
    if (p && indeks >= 0 && indeks < p.dialog.length) p.dialog.splice(indeks, 1);
  });
}
