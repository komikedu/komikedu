import { getLayout } from "@/lib/ai/layouts";
import { PAGE_H, PAGE_W, type Bubble, type BubbleKind, type EditorPage, type Panel } from "./types";

/** UUID agar id bisa langsung dipakai sebagai primary key di database. */
export const newId = () => crypto.randomUUID();

/** Buat halaman kosong dari template layout (koordinat template 0-1 diubah ke unit kanvas). */
export function createPage(layoutId: string, adegan: string[] = []): EditorPage {
  const layout = getLayout(layoutId);
  const panels: Panel[] = layout.panels.map((r, i) => ({
    id: newId(),
    x: Math.round(r.x * PAGE_W),
    y: Math.round(r.y * PAGE_H),
    w: Math.round(r.w * PAGE_W),
    h: Math.round(r.h * PAGE_H),
    imageUrl: null,
    visible: true,
    adegan: adegan[i] ?? "",
  }));
  return { id: newId(), layoutId, panels, bubbles: [] };
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
