import sharp from "sharp";
import type { Rect } from "./layouts";

export type CroppedPanel = { urutan: number; image: Buffer; width: number; height: number };

const ANALYSIS_WIDTH = 240;
const NON_WHITE = 235;
const MIN_PANEL_AREA = 0.02; // fraksi luas halaman

/**
 * Deteksi panel dari celah putih antar panel (komponen terhubung non-putih).
 * Model gambar tidak mengikuti persentase template secara presisi, jadi
 * koordinat template hanya dipakai sebagai cadangan.
 * Mengembalikan Rect ternormalisasi dalam urutan baca, atau null jika jumlahnya tidak cocok.
 */
export async function detectPanels(page: Uint8Array, expected: number): Promise<Rect[] | null> {
  const { data, info } = await sharp(page)
    .resize({ width: ANALYSIS_WIDTH })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;

  const label = new Int32Array(w * h);
  const boxes: { x0: number; y0: number; x1: number; y1: number }[] = [];
  const stack: number[] = [];

  for (let start = 0; start < w * h; start++) {
    if (data[start] >= NON_WHITE || label[start]) continue;
    const id = boxes.length + 1;
    const box = { x0: w, y0: h, x1: 0, y1: 0 };
    stack.push(start);
    label[start] = id;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w;
      const y = (p - x) / w;
      if (x < box.x0) box.x0 = x;
      if (x > box.x1) box.x1 = x;
      if (y < box.y0) box.y0 = y;
      if (y > box.y1) box.y1 = y;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (data[q] < NON_WHITE && !label[q]) {
          label[q] = id;
          stack.push(q);
        }
      }
    }
    boxes.push(box);
  }

  const rects = boxes
    .map((b) => ({ x: b.x0 / w, y: b.y0 / h, w: (b.x1 - b.x0 + 1) / w, h: (b.y1 - b.y0 + 1) / h }))
    .filter((r) => r.w * r.h >= MIN_PANEL_AREA)
    .sort((a, b) => b.w * b.h - a.w * a.h)
    .slice(0, expected);

  if (rects.length !== expected) return null;

  // urutan baca: baris dulu (toleransi 5% tinggi), lalu kiri ke kanan
  return rects.sort((a, b) => (Math.abs(a.y - b.y) < 0.05 ? a.x - b.x : a.y - b.y));
}

const iou = (a: Rect, b: Rect) => {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inter = ix * iy;
  return inter / (a.w * a.h + b.w * b.h - inter || 1);
};

/**
 * Pasangkan panel hasil deteksi dengan kotak yang diharapkan berdasarkan tumpang-tindih terbesar.
 * Model gambar tidak menaruh panel persis di posisi yang diminta, tapi posisinya berdekatan.
 * Kotak tanpa pasangan yang cukup mirip memakai posisi yang diharapkan sebagai cadangan.
 */
export function matchPanels(expected: Rect[], detected: Rect[] | null): { rect: Rect; terdeteksi: boolean }[] {
  const used = new Set<number>();
  return expected.map((e) => {
    let best = -1;
    let bestScore = 0.15;
    detected?.forEach((d, i) => {
      const score = iou(e, d);
      if (!used.has(i) && score > bestScore) {
        best = i;
        bestScore = score;
      }
    });
    if (best < 0 || !detected) return { rect: e, terdeteksi: false };
    used.add(best);
    return { rect: detected[best], terdeteksi: true };
  });
}

/**
 * Potong gambar halaman menjadi gambar per panel (WebP), dalam urutan yang sama dengan `rects`
 * (kotak panel editor, ternormalisasi 0-1).
 */
export async function cropPanels(page: Uint8Array, rects: Rect[], opts: { quality?: number } = {}): Promise<CroppedPanel[]> {
  const { quality = 85 } = opts;
  const { width = 0, height = 0 } = await sharp(page).metadata();
  if (!width || !height) throw new Error("Gambar halaman tidak valid");

  const matched = matchPanels(rects, await detectPanels(page, rects.length));

  return Promise.all(
    matched.map(async ({ rect: r, terdeteksi }, i) => {
      // deteksi menyertakan garis bingkai, jadi masuk sedikit agar garis tidak ikut
      const inset = terdeteksi ? Math.max(4, Math.round(width * 0.012)) : Math.round(width * 0.004);
      const left = Math.max(0, Math.round(r.x * width) + inset);
      const top = Math.max(0, Math.round(r.y * height) + inset);
      const w = Math.max(1, Math.min(Math.round(r.w * width) - 2 * inset, width - left));
      const h = Math.max(1, Math.min(Math.round(r.h * height) - 2 * inset, height - top));
      const image = await sharp(page).extract({ left, top, width: w, height: h }).webp({ quality }).toBuffer();
      return { urutan: i + 1, image, width: w, height: h };
    }),
  );
}
