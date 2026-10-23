import { getLayout } from "@/lib/ai/layouts";
import { PAGE_H, PAGE_W, type Bubble, type BubbleKind, type EditorPage, type MathElement, type Panel } from "./types";

/** UUID agar id bisa langsung dipakai sebagai primary key di database. */
export const newId = () => crypto.randomUUID();

/** Jarak panel dari tepi halaman (unit kanvas), seperti margin cetak komik. */
export const PAGE_MARGIN = 54;

/** Buat halaman kosong dari template layout (koordinat template 0-1 dipetakan ke area dalam margin). */
export function createPage(layoutId: string, adegan: string[] = []): EditorPage {
  const layout = getLayout(layoutId);
  const innerW = PAGE_W - PAGE_MARGIN * 2;
  const innerH = PAGE_H - PAGE_MARGIN * 2;
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
  return { id: newId(), layoutId, panels, bubbles: [], elements: [] };
}

const DEFAULT_SIZE: Record<BubbleKind, { w: number; h: number }> = {
  bicara: { w: 260, h: 130 },
  pikir: { w: 260, h: 130 },
  narasi: { w: 320, h: 90 },
};

/** Balon baru di tengah titik (cx, cy), dijepit agar tetap di dalam halaman. */
export function createBubble(panelId: string, kind: BubbleKind, cx: number, cy: number, text = "Teks baru"): Bubble {
  const { w, h } = DEFAULT_SIZE[kind];
  return {
    id: newId(),
    panelId,
    kind,
    text,
    x: Math.min(Math.max(cx - w / 2, 0), PAGE_W - w),
    y: Math.min(Math.max(cy - h / 2, 0), PAGE_H - h),
    w,
    h,
    tail: kind === "narasi" ? null : { dx: 20, dy: h / 2 + 40 },
    fontSize: 26,
    visible: true,
  };
}

/** Elemen "kumpulan benda" baru di titik (cx, cy): bawaan 10 apel, 5 per baris. */
export function createKumpulan(panelId: string, cx: number, cy: number): MathElement {
  const w = 300;
  const h = 120;
  return {
    id: newId(),
    panelId,
    kind: "kumpulan",
    x: Math.round(Math.min(Math.max(cx - w / 2, 0), PAGE_W - w)),
    y: Math.round(Math.min(Math.max(cy - h / 2, 0), PAGE_H - h)),
    w,
    h,
    ikon: "apel",
    jumlah: 10,
    kolom: 5,
    visible: true,
  };
}
