import { cssLatar } from "@/lib/editor/latar-panel";
import { UKURAN_BAWAAN, type Latar, type UkuranHalaman } from "@/lib/editor/types";

type Rect = { x: number; y: number; w: number; h: number };
type Pt = { x: number; y: number };

/** Halaman 1 komik sebagai data ringan untuk thumbnail (koordinat editor; ukuran halaman bawaan 900 x 1200). */
export type HalamanThumb = {
  /** ukuran kanvas halaman; kosong = ukuran bawaan */
  ukuran?: UkuranHalaman;
  panels: (Rect & { corners?: Pt[]; gambar?: Rect; latar?: Latar; imageUrl: string | null })[];
};

const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

/** Posisi panel dalam persen halaman, plus clip-path bila sudutnya miring. */
export function gayaPanel(p: HalamanThumb["panels"][number], ukuran: UkuranHalaman = UKURAN_BAWAAN) {
  return {
    left: pct(p.x / ukuran.w),
    top: pct(p.y / ukuran.h),
    width: pct(p.w / ukuran.w),
    height: pct(p.h / ukuran.h),
    clipPath:
      p.corners?.length === 4 ? `polygon(${p.corners.map((c) => `${pct((c.x - p.x) / p.w)} ${pct((c.y - p.y) / p.h)}`).join(", ")})` : undefined,
    ...(p.latar ? cssLatar(p.latar, p.w, p.h) : {}),
  };
}

/** Posisi gambar di dalam panel (persen panel); tanpa pengaturan guru, gambar memenuhi panel. */
export function gayaGambar(p: HalamanThumb["panels"][number]) {
  const g = p.gambar;
  if (!g) return { left: "0%", top: "0%", width: "100%", height: "100%" };
  return { left: pct((g.x - p.x) / p.w), top: pct((g.y - p.y) / p.h), width: pct(g.w / p.w), height: pct(g.h / p.h) };
}

type Row = { posisi: (Rect & { corners?: Pt[]; gambar?: Rect; latar?: Latar }) | null; image_url: string | null; tampil: boolean | null; urutan: number };

/** Ubah baris panel halaman 1 dari database; null bila tidak ada panel yang punya gambar. */
export function halamanThumb(rows: Row[] | null | undefined, ukuran?: UkuranHalaman): HalamanThumb | null {
  const panels = [...(rows ?? [])]
    .sort((a, b) => a.urutan - b.urutan)
    .filter((r) => r.posisi && r.tampil !== false)
    .map((r) => ({ ...r.posisi!, imageUrl: r.image_url }));
  return panels.some((p) => p.imageUrl) ? { panels, ...(ukuran ? { ukuran } : {}) } : null;
}
