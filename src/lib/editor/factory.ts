import { getLayout } from "@/lib/ai/layouts";
import { gayaTeks } from "./gaya-teks";
import { UKURAN_BAWAAN, type Bubble, type BubbleKind, type EditorPage, type ElemenKumpulan, type ElemenStiker, type ElemenTeks, type Panel, type UkuranHalaman } from "./types";

/** UUID agar id bisa langsung dipakai sebagai primary key di database. */
export const newId = () => crypto.randomUUID();

/** Jarak panel dari tepi halaman (unit kanvas), seperti margin cetak komik. */
export const PAGE_MARGIN = 54;

/** Buat halaman kosong dari template layout (koordinat template 0-1 dipetakan ke area dalam margin). */
export function createPage(layoutId: string, adegan: string[] = [], ukuran: UkuranHalaman = UKURAN_BAWAAN): EditorPage {
  const layout = getLayout(layoutId);
  const innerW = ukuran.w - PAGE_MARGIN * 2;
  const innerH = ukuran.h - PAGE_MARGIN * 2;
  const panels: Panel[] = layout.panels.map((r, i) => ({
    id: newId(),
    x: Math.round(PAGE_MARGIN + r.x * innerW),
    y: Math.round(PAGE_MARGIN + r.y * innerH),
    w: Math.round(r.w * innerW),
    h: Math.round(r.h * innerH),
    imageUrl: null,
    visible: true,
    adegan: adegan[i] ?? "",
  }));
  return { id: newId(), w: ukuran.w, h: ukuran.h, layoutId, panels, bubbles: [], elements: [] };
}

const DEFAULT_SIZE: Record<BubbleKind, { w: number; h: number }> = {
  bicara: { w: 260, h: 130 },
  pikir: { w: 260, h: 130 },
  narasi: { w: 320, h: 90 },
};

/** Balon baru di tengah titik (cx, cy), dijepit agar tetap di dalam halaman. */
export function createBubble(panelId: string, kind: BubbleKind, cx: number, cy: number, text = "Teks baru", ukuran: UkuranHalaman = UKURAN_BAWAAN): Bubble {
  const { w, h } = DEFAULT_SIZE[kind];
  return {
    id: newId(),
    panelId,
    kind,
    text,
    x: Math.min(Math.max(cx - w / 2, 0), ukuran.w - w),
    y: Math.min(Math.max(cy - h / 2, 0), ukuran.h - h),
    w,
    h,
    tail: kind === "narasi" ? null : { dx: 20, dy: h / 2 + 40 },
    fontSize: 26,
    visible: true,
  };
}

/** Elemen "kumpulan benda" baru di titik (cx, cy): bawaan 10 apel, 5 per baris. */
export function createKumpulan(panelId: string | null, cx: number, cy: number, ukuran: UkuranHalaman = UKURAN_BAWAAN): ElemenKumpulan {
  const w = 300;
  const h = 120;
  return {
    id: newId(),
    panelId,
    kind: "kumpulan",
    x: Math.round(Math.min(Math.max(cx - w / 2, 0), ukuran.w - w)),
    y: Math.round(Math.min(Math.max(cy - h / 2, 0), ukuran.h - h)),
    w,
    h,
    ikon: "apel",
    jumlah: 10,
    kolom: 5,
    visible: true,
  };
}

/** Teks bergaya baru di titik (cx, cy): bawaan efek suara "BUM!" bergaya ledakan. */
export function createTeks(panelId: string | null, cx: number, cy: number, gayaId = "sfx-ledak", text = "BUM!", ukuran: UkuranHalaman = UKURAN_BAWAAN): ElemenTeks {
  const g = gayaTeks(gayaId);
  const w = g.kotak?.w ?? 360;
  const h = g.kotak?.h ?? 170;
  return {
    id: newId(),
    panelId,
    kind: "teks",
    x: Math.round(Math.min(Math.max(cx - w / 2, 0), ukuran.w - w)),
    y: Math.round(Math.min(Math.max(cy - h / 2, 0), ukuran.h - h)),
    w,
    h,
    text,
    gaya: g.id,
    fontSize: g.fontSize,
    visible: true,
  };
}

/** Stiker baru di tengah halaman; sisi terpanjangnya `sisi` unit dan rasio gambar (lebar / tinggi) dipertahankan. */
export function createStiker(url: string, rasio: number, sisi = 420, ukuran: UkuranHalaman = UKURAN_BAWAAN): ElemenStiker {
  const r = Number.isFinite(rasio) && rasio > 0 ? rasio : 1;
  const w = Math.round(r >= 1 ? sisi : sisi * r);
  const h = Math.round(r >= 1 ? sisi / r : sisi);
  return {
    id: newId(),
    panelId: null,
    kind: "stiker",
    x: Math.round((ukuran.w - w) / 2),
    y: Math.round((ukuran.h - h) / 2),
    w: Math.max(40, w),
    h: Math.max(40, h),
    url,
    visible: true,
  };
}
