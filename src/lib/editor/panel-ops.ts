import { newId } from "./factory";
import { PAGE_H, PAGE_W, type Bubble, type EditorPage, type Panel, type Point } from "./types";

/**
 * Operasi panel di editor. Semua fungsi MENGUBAH halaman di tempat (cocok dengan draft immer di store)
 * dan mengembalikan true bila ada perubahan.
 */

export const PANEL_GAP = 16;
export const MIN_PANEL = 60;
export const MAX_PANELS_PER_PAGE = 12;
const OFFSET = 24;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const center = (b: Bubble) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

export type SplitArah = "horizontal" | "vertikal";

/** horizontal = dibagi kiri-kanan, vertikal = dibagi atas-bawah. Panel baru disisipkan tepat setelah panel asal. */
export function splitPanel(page: EditorPage, panelId: string, arah: SplitArah): boolean {
  const idx = page.panels.findIndex((p) => p.id === panelId);
  if (idx < 0 || page.panels.length >= MAX_PANELS_PER_PAGE) return false;
  const p = page.panels[idx];
  // panel miring dibagi berdasarkan kotak pembatasnya; kedua hasilnya kembali kotak
  p.corners = null;
  const total = arah === "horizontal" ? p.w : p.h;
  const half = Math.floor((total - PANEL_GAP) / 2);
  if (half < MIN_PANEL) return false;

  const baru: Panel = { ...p, id: newId(), imageUrl: null, adegan: "", corners: null };
  if (arah === "horizontal") {
    p.w = half;
    baru.x = p.x + half + PANEL_GAP;
    baru.w = total - half - PANEL_GAP;
  } else {
    p.h = half;
    baru.y = p.y + half + PANEL_GAP;
    baru.h = total - half - PANEL_GAP;
  }
  page.panels.splice(idx + 1, 0, baru);

  // balon yang titik tengahnya jatuh di bagian baru ikut pindah ke panel baru
  for (const b of page.bubbles) {
    if (b.panelId !== p.id) continue;
    const c = center(b);
    const diBaru = arah === "horizontal" ? c.x >= baru.x : c.y >= baru.y;
    if (diBaru) b.panelId = baru.id;
  }
  return true;
}

/** Duplikat panel beserta balonnya, digeser sedikit agar terlihat, tetap di dalam halaman. */
export function duplicatePanel(page: EditorPage, panelId: string): string | null {
  const idx = page.panels.findIndex((p) => p.id === panelId);
  if (idx < 0 || page.panels.length >= MAX_PANELS_PER_PAGE) return null;
  const p = page.panels[idx];
  const x = clamp(p.x + OFFSET, 0, PAGE_W - p.w);
  const y = clamp(p.y + OFFSET, 0, PAGE_H - p.h);
  const dx = x - p.x;
  const dy = y - p.y;
  const salinan: Panel = { ...p, id: newId(), x, y, corners: p.corners ? p.corners.map((c) => ({ x: c.x + dx, y: c.y + dy })) : null };
  page.panels.splice(idx + 1, 0, salinan);
  const balon = page.bubbles
    .filter((b) => b.panelId === p.id)
    .map((b) => ({ ...b, id: newId(), panelId: salinan.id, x: b.x + dx, y: b.y + dy, tail: b.tail ? { ...b.tail } : null }));
  page.bubbles.push(...balon);
  return salinan.id;
}

/** Hapus panel dan balonnya. Halaman selalu menyisakan minimal satu panel. */
export function deletePanel(page: EditorPage, panelId: string): boolean {
  if (page.panels.length <= 1 || !page.panels.some((p) => p.id === panelId)) return false;
  page.panels = page.panels.filter((p) => p.id !== panelId);
  page.bubbles = page.bubbles.filter((b) => b.panelId !== panelId);
  return true;
}

/** Geser panel (dijepit di dalam halaman); balon miliknya ikut bergeser sejauh yang benar-benar diterapkan. */
export function movePanel(page: EditorPage, panelId: string, dx: number, dy: number): boolean {
  const p = page.panels.find((x) => x.id === panelId);
  if (!p) return false;
  const nx = clamp(Math.round(p.x + dx), 0, PAGE_W - p.w);
  const ny = clamp(Math.round(p.y + dy), 0, PAGE_H - p.h);
  const ax = nx - p.x;
  const ay = ny - p.y;
  if (!ax && !ay) return false;
  p.x = nx;
  p.y = ny;
  if (p.corners) p.corners = p.corners.map((c) => ({ x: c.x + ax, y: c.y + ay }));
  for (const b of page.bubbles) {
    if (b.panelId === panelId) {
      b.x += ax;
      b.y += ay;
    }
  }
  return true;
}

/** Ubah posisi dan ukuran panel, dijepit di dalam halaman dengan ukuran minimum. */
export function resizePanel(page: EditorPage, panelId: string, r: { x: number; y: number; w: number; h: number }): boolean {
  const p = page.panels.find((x) => x.id === panelId);
  if (!p) return false;
  const lama = { x: p.x, y: p.y, w: p.w, h: p.h };
  const x = clamp(Math.round(r.x), 0, PAGE_W - MIN_PANEL);
  const y = clamp(Math.round(r.y), 0, PAGE_H - MIN_PANEL);
  p.x = x;
  p.y = y;
  p.w = clamp(Math.round(r.w), MIN_PANEL, PAGE_W - x);
  p.h = clamp(Math.round(r.h), MIN_PANEL, PAGE_H - y);
  if (p.corners) {
    const sx = p.w / (lama.w || 1);
    const sy = p.h / (lama.h || 1);
    p.corners = p.corners.map((c) => ({ x: Math.round(x + (c.x - lama.x) * sx), y: Math.round(y + (c.y - lama.y) * sy) }));
  }
  return true;
}

/** Duplikat balon di panel yang sama, digeser sedikit. */
export function duplicateBubble(page: EditorPage, bubbleId: string): string | null {
  const b = page.bubbles.find((x) => x.id === bubbleId);
  if (!b) return null;
  const salinan: Bubble = {
    ...b,
    id: newId(),
    x: clamp(b.x + OFFSET, 0, PAGE_W - b.w),
    y: clamp(b.y + OFFSET, 0, PAGE_H - b.h),
    tail: b.tail ? { ...b.tail } : null,
  };
  page.bubbles.push(salinan);
  return salinan.id;
}

// ---------------------------------------------------------------------------
// Panel miring: sudut bisa digeser satu per satu.

export const rectCorners = (p: { x: number; y: number; w: number; h: number }): Point[] => [
  { x: p.x, y: p.y },
  { x: p.x + p.w, y: p.y },
  { x: p.x + p.w, y: p.y + p.h },
  { x: p.x, y: p.y + p.h },
];

/** Sudut panel; panel kotak dikembalikan sebagai empat sudut kotaknya. */
export const panelCorners = (p: Panel): Point[] => p.corners ?? rectCorners(p);

const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

/** Segi empat cembung dengan urutan sudut searah jarum jam (di koordinat layar). */
export function isConvexQuad(c: Point[]): boolean {
  if (c.length !== 4) return false;
  for (let i = 0; i < 4; i++) {
    if (cross(c[i], c[(i + 1) % 4], c[(i + 2) % 4]) <= 0) return false;
  }
  return true;
}

function bbox(c: Point[]) {
  const xs = c.map((p) => p.x);
  const ys = c.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Pasang sudut ke panel: simpan kotak pembatasnya, dan kembali jadi panel kotak bila sudutnya membentuk kotak. */
function applyCorners(p: Panel, c: Point[]) {
  const b = bbox(c);
  p.x = b.x;
  p.y = b.y;
  p.w = b.w;
  p.h = b.h;
  const kotak = rectCorners(b).every((r, i) => Math.abs(r.x - c[i].x) < 0.5 && Math.abs(r.y - c[i].y) < 0.5);
  p.corners = kotak ? null : c;
}

/**
 * Geser satu sudut panel (0 kiri-atas, 1 kanan-atas, 2 kanan-bawah, 3 kiri-bawah).
 * Ditolak bila bentuknya jadi tidak cembung, terbalik, atau terlalu kecil.
 */
export function setCorner(page: EditorPage, panelId: string, index: number, pt: Point): boolean {
  const p = page.panels.find((x) => x.id === panelId);
  if (!p || index < 0 || index > 3) return false;
  const c = panelCorners(p).map((q) => ({ ...q }));
  c[index] = { x: clamp(Math.round(pt.x), 0, PAGE_W), y: clamp(Math.round(pt.y), 0, PAGE_H) };
  const b = bbox(c);
  if (!isConvexQuad(c) || b.w < MIN_PANEL || b.h < MIN_PANEL) return false;
  applyCorners(p, c);
  return true;
}

/** Kembalikan panel miring menjadi kotak (memakai kotak pembatasnya). */
export function resetCorners(page: EditorPage, panelId: string): boolean {
  const p = page.panels.find((x) => x.id === panelId);
  if (!p?.corners) return false;
  p.corners = null;
  return true;
}
