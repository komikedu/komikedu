import type { Script } from "@/lib/ai/schemas";
import { layoutHalaman } from "@/lib/comics/naskah";
import { createPage, createTeks, newId } from "./factory";
import { UKURAN_BAWAAN, type Bubble, type EditorPage, type Panel, type UkuranHalaman } from "./types";

type ScriptPanel = Script["halaman"][number]["panel"][number];

const MARGIN = 16;
const GAP = 10;
const FONT = 24;
const PAD = 28;

/** Perkiraan tinggi balon agar teks muat (rata-rata lebar huruf ~0,55 x ukuran font). */
function bubbleHeight(text: string, width: number, fontSize: number) {
  const charsPerLine = Math.max(8, Math.floor((width - PAD) / (fontSize * 0.55)));
  const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
  return Math.max(80, Math.round(lines * fontSize * 1.25 + PAD + 8));
}

/** Tata letak balon otomatis di dalam panel: bersusun dari atas, selang-seling kiri dan kanan. */
export function layoutBubbles(panel: Panel, dialog: ScriptPanel["dialog"]): Bubble[] {
  const bubbles: Bubble[] = [];
  let y = panel.y + MARGIN;
  dialog.forEach((d, i) => {
    const w = Math.round(Math.min(panel.w - MARGIN * 2, Math.max(220, panel.w * 0.62)));
    const h = Math.min(bubbleHeight(d.teks, w, FONT), panel.h - MARGIN * 2);
    const x = d.jenis === "narasi" || i % 2 === 0 ? panel.x + MARGIN : panel.x + panel.w - w - MARGIN;
    const top = Math.min(y, panel.y + panel.h - h - MARGIN);
    const cx = x + w / 2;
    const towardCenter = Math.max(-60, Math.min(60, (panel.x + panel.w / 2 - cx) * 0.3));
    bubbles.push({
      id: newId(),
      panelId: panel.id,
      kind: d.jenis,
      text: d.teks,
      x: Math.round(x),
      y: Math.round(top),
      w,
      h,
      tail: d.jenis === "narasi" ? null : { dx: Math.round(towardCenter), dy: Math.round(h / 2 + 36) },
      fontSize: FONT,
      visible: true,
    });
    y = top + h + GAP;
  });
  return bubbles;
}

export type PanelScriptJson = Pick<ScriptPanel, "adegan" | "karakter" | "dialog" | "hitungan"> & { sampul?: boolean };

/** Panjang judul sampul yang dipakai (judul komik bisa sampai 120 karakter, teks bergaya maksimal 80). */
const MAKS_JUDUL_SAMPUL = 80;

/**
 * Judul di sampul: teks bergaya "Judul kuning" bebas di atas halaman, di area yang dikosongkan prompt gambar sampul.
 * Ukuran huruf mengecil untuk judul panjang agar muat dalam dua sampai tiga baris.
 */
export function judulSampul(judul: string, ukuran: UkuranHalaman) {
  const teks = judul.replace(/\s+/g, " ").trim().slice(0, MAKS_JUDUL_SAMPUL);
  const el = createTeks(null, ukuran.w / 2, ukuran.h * 0.14, "judul-kuning", teks || "Judul komik");
  const w = Math.round(ukuran.w * 0.88);
  const h = Math.round(ukuran.h * 0.24);
  el.w = w;
  el.h = h;
  el.x = Math.round((ukuran.w - w) / 2);
  el.y = Math.round(ukuran.h * 0.03);
  // huruf lebih kecil untuk judul panjang: kira-kira 18 huruf per baris pada ukuran 110 dengan lebar 880
  const perBaris = Math.max(1, Math.floor((w / ukuran.w) * 20));
  const baris = Math.ceil(el.text.length / perBaris);
  el.fontSize = Math.max(40, Math.min(110, Math.round(h / Math.max(1, baris) / 1.25), Math.round((w / Math.min(el.text.length, perBaris)) * 1.1)));
  return el;
}

/**
 * Ubah naskah yang sudah disetujui menjadi halaman editor.
 * Mengembalikan juga isi script_json per panel (disimpan server, dipakai untuk membuat gambar).
 */
export function scriptToPages(script: Script, ukuran: UkuranHalaman = UKURAN_BAWAAN, judul = ""): { pages: EditorPage[]; panelScripts: Map<string, PanelScriptJson> } {
  const panelScripts = new Map<string, PanelScriptJson>();
  const pages = [...script.halaman]
    .sort((a, b) => a.urutan - b.urutan)
    .map((h) => {
      const scriptPanels = [...h.panel].sort((a, b) => a.urutan - b.urutan);
      const page = createPage(
        layoutHalaman(h),
        scriptPanels.map((p) => p.adegan),
        ukuran,
      );
      page.panels.forEach((panel, i) => {
        const sp = scriptPanels[i];
        panelScripts.set(panel.id, { adegan: sp.adegan, karakter: sp.karakter, dialog: sp.dialog, hitungan: sp.hitungan, ...(h.sampul ? { sampul: true } : {}) });
        page.bubbles.push(...layoutBubbles(panel, sp.dialog));
      });
      if (h.sampul && judul.trim()) page.elements.push(judulSampul(judul, ukuran));
      return page;
    });
  return { pages, panelScripts };
}
