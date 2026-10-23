import { PAGE_MARGIN } from "./factory";
import { PANEL_GAP, panelCorners } from "./panel-ops";
import { PAGE_H, PAGE_W, type EditorPage, type Point } from "./types";

/** Jarak tempel dalam unit halaman (kanvas menyesuaikannya dengan zoom agar terasa sama di layar). */
export const SNAP_DISTANCE = 10;

/**
 * Garis tempel dalam dua tingkat: `xs`/`ys` = sejajar persis (tepi/sudut panel lain, margin, tepi halaman),
 * `xsGap`/`ysGap` = berjarak satu celah dari panel lain. Garis sejajar persis selalu didahulukan.
 */
export type SnapTargets = { xs: number[]; ys: number[]; xsGap: number[]; ysGap: number[] };
export type Guides = { x: number[]; y: number[] };

const uniq = (a: number[]) => [...new Set(a.map((v) => Math.round(v)))];

export function snapTargets(page: EditorPage, excludePanelId: string, gap = PANEL_GAP): SnapTargets {
  const xs = [0, PAGE_W, PAGE_MARGIN, PAGE_W - PAGE_MARGIN, PAGE_W / 2];
  const ys = [0, PAGE_H, PAGE_MARGIN, PAGE_H - PAGE_MARGIN, PAGE_H / 2];
  const xsGap: number[] = [];
  const ysGap: number[] = [];
  for (const p of page.panels) {
    if (p.id === excludePanelId || !p.visible) continue;
    for (const c of panelCorners(p)) {
      xs.push(c.x);
      ys.push(c.y);
      // celah seragam di sisi panel miring yang bersebelahan
      xsGap.push(c.x - gap, c.x + gap);
      ysGap.push(c.y - gap, c.y + gap);
    }
    xs.push(p.x, p.x + p.w);
    ys.push(p.y, p.y + p.h);
    xsGap.push(p.x - gap, p.x + p.w + gap);
    ysGap.push(p.y - gap, p.y + p.h + gap);
  }
  return { xs: uniq(xs), ys: uniq(ys), xsGap: uniq(xsGap), ysGap: uniq(ysGap) };
}

/** Nilai terdekat dalam jarak tempel, atau null. Bila seri, yang pertama ditemukan dipakai. */
export function nearest(v: number, targets: number[], threshold: number): number | null {
  let best: number | null = null;
  let bestD = threshold;
  for (const t of targets) {
    const d = Math.abs(t - v);
    if (d < bestD || (best === null && d <= bestD)) {
      best = t;
      bestD = d;
    }
  }
  return best;
}

/** Cari garis sejajar persis dulu; hanya bila tidak ada, pakai garis berjarak satu celah. */
const nearestTier = (v: number, exact: number[], gap: number[], threshold: number) => nearest(v, exact, threshold) ?? nearest(v, gap, threshold);

/** Tempelkan satu titik (mis. sudut panel) ke garis terdekat di sumbu x dan y secara terpisah. */
export function snapPoint(pt: Point, t: SnapTargets, threshold = SNAP_DISTANCE): { pt: Point; guides: Guides } {
  const sx = nearestTier(pt.x, t.xs, t.xsGap, threshold);
  const sy = nearestTier(pt.y, t.ys, t.ysGap, threshold);
  return { pt: { x: sx ?? pt.x, y: sy ?? pt.y }, guides: { x: sx === null ? [] : [sx], y: sy === null ? [] : [sy] } };
}

/**
 * Saat panel digeser utuh: tepi kiri/kanan dan atas/bawahnya menempel ke garis terdekat.
 * Mengembalikan koreksi pergeseran yang harus ditambahkan ke posisi yang diusulkan.
 */
export function snapRectMove(
  r: { x: number; y: number; w: number; h: number },
  t: SnapTargets,
  threshold = SNAP_DISTANCE,
): { dx: number; dy: number; guides: Guides } {
  const pick = (edges: number[], exact: number[], gap: number[]) => {
    for (const targets of [exact, gap]) {
      let best: { d: number; line: number } | null = null;
      for (const e of edges) {
        const n = nearest(e, targets, threshold);
        if (n !== null && (!best || Math.abs(n - e) < Math.abs(best.d))) best = { d: n - e, line: n };
      }
      if (best) return best;
    }
    return null;
  };
  const bx = pick([r.x, r.x + r.w], t.xs, t.xsGap);
  const by = pick([r.y, r.y + r.h], t.ys, t.ysGap);
  return { dx: bx?.d ?? 0, dy: by?.d ?? 0, guides: { x: bx ? [bx.line] : [], y: by ? [by.line] : [] } };
}
