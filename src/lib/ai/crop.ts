import sharp from "sharp";
import { getLayout, type Rect } from "./layouts";

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

/** Potong gambar halaman menjadi gambar per panel, keluaran WebP. */
export async function cropPanels(
  page: Uint8Array,
  layoutId: string,
  opts: { quality?: number } = {},
): Promise<CroppedPanel[]> {
  const { quality = 85 } = opts;
  const layout = getLayout(layoutId);
  const { width = 0, height = 0 } = await sharp(page).metadata();
  if (!width || !height) throw new Error("Gambar halaman tidak valid");

  const detected = await detectPanels(page, layout.panels.length);
  const rects = detected ?? layout.panels;
  // deteksi menyertakan garis bingkai, jadi masuk sedikit agar garis tidak ikut
  const inset = detected ? Math.max(4, Math.round(width * 0.012)) : Math.round(width * 0.004);

  return Promise.all(
    rects.map(async (r, i) => {
      const left = Math.round(r.x * width) + inset;
      const top = Math.round(r.y * height) + inset;
      const w = Math.min(Math.round(r.w * width) - 2 * inset, width - left);
      const h = Math.min(Math.round(r.h * height) - 2 * inset, height - top);
      const image = await sharp(page).extract({ left, top, width: w, height: h }).webp({ quality }).toBuffer();
      return { urutan: i + 1, image, width: w, height: h };
    }),
  );
}
