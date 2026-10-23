import { PAGE_H, PAGE_W } from "@/lib/editor/types";

type Rect = { x: number; y: number; w: number; h: number };
type Pt = { x: number; y: number };

/** Halaman 1 komik sebagai data ringan untuk thumbnail (koordinat editor, halaman 900 x 1200). */
export type HalamanThumb = {
  panels: (Rect & { corners?: Pt[]; gambar?: Rect; imageUrl: string | null })[];
};

const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

/** Posisi panel dalam persen halaman, plus clip-path bila sudutnya miring. */
export function gayaPanel(p: HalamanThumb["panels"][number]) {
  return {
    left: pct(p.x / PAGE_W),
    top: pct(p.y / PAGE_H),
    width: pct(p.w / PAGE_W),
    height: pct(p.h / PAGE_H),
    clipPath:
      p.corners?.length === 4 ? `polygon(${p.corners.map((c) => `${pct((c.x - p.x) / p.w)} ${pct((c.y - p.y) / p.h)}`).join(", ")})` : undefined,
  };
}

/** Posisi gambar di dalam panel (persen panel); tanpa pengaturan guru, gambar memenuhi panel. */
export function gayaGambar(p: HalamanThumb["panels"][number]) {
  const g = p.gambar;
  if (!g) return { left: "0%", top: "0%", width: "100%", height: "100%" };
  return { left: pct((g.x - p.x) / p.w), top: pct((g.y - p.y) / p.h), width: pct(g.w / p.w), height: pct(g.h / p.h) };
}

type Row = { posisi: (Rect & { corners?: Pt[]; gambar?: Rect }) | null; image_url: string | null; tampil: boolean | null; urutan: number };

/** Ubah baris panel halaman 1 dari database; null bila tidak ada panel yang punya gambar. */
export function halamanThumb(rows: Row[] | null | undefined): HalamanThumb | null {
  const panels = [...(rows ?? [])]
    .sort((a, b) => a.urutan - b.urutan)
    .filter((r) => r.posisi && r.tampil !== false)
    .map((r) => ({ ...r.posisi!, imageUrl: r.image_url }));
  return panels.some((p) => p.imageUrl) ? { panels } : null;
}
