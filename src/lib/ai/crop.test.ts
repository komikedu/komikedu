import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { cropPanels, detectPanels } from "./crop";
import { LAYOUTS } from "./layouts";

const W = 600;
const H = 800;

/** Halaman putih dengan margin 6% dan panel berbingkai hitam pada posisi `rects` (0-1). */
async function pageWith(rects: { x: number; y: number; w: number; h: number }[]) {
  const layers = await Promise.all(
    rects.map(async (r) => {
      const pw = Math.round(r.w * W);
      const ph = Math.round(r.h * H);
      const input = await sharp({ create: { width: pw, height: ph, channels: 3, background: "#222" } })
        .composite([
          {
            input: await sharp({ create: { width: pw - 8, height: ph - 8, channels: 3, background: "#f5e6a0" } })
              .png()
              .toBuffer(),
            left: 4,
            top: 4,
          },
        ])
        .png()
        .toBuffer();
      return { input, left: Math.round(r.x * W), top: Math.round(r.y * H) };
    }),
  );
  return new Uint8Array(
    await sharp({ create: { width: W, height: H, channels: 3, background: "#fff" } })
      .composite(layers)
      .png()
      .toBuffer(),
  );
}

describe("detectPanels", () => {
  it("menemukan panel meski posisinya tidak sama dengan template", async () => {
    // margin 6% dan jarak 4%: sengaja berbeda dari template
    const actual = [
      { x: 0.06, y: 0.06, w: 0.88, h: 0.42 },
      { x: 0.06, y: 0.52, w: 0.42, h: 0.42 },
      { x: 0.52, y: 0.52, w: 0.42, h: 0.42 },
    ];
    const found = await detectPanels(await pageWith(actual), 3);
    expect(found).toHaveLength(3);
    found!.forEach((f, i) => {
      expect(f.x).toBeCloseTo(actual[i].x, 1);
      expect(f.y).toBeCloseTo(actual[i].y, 1);
      expect(f.w).toBeCloseTo(actual[i].w, 1);
      expect(f.h).toBeCloseTo(actual[i].h, 1);
    });
  });

  it("mengembalikan null jika jumlah panel tidak cocok", async () => {
    const page = await pageWith([{ x: 0.06, y: 0.06, w: 0.88, h: 0.88 }]);
    expect(await detectPanels(page, 3)).toBeNull();
  });
});

describe("cropPanels", () => {
  it.each(LAYOUTS.map((l) => [l.id, l.panels.length] as const))(
    "memotong %s menjadi jumlah panel yang benar (cadangan template pada halaman kosong)",
    async (id, count) => {
      const blank = new Uint8Array(
        await sharp({ create: { width: W, height: H, channels: 3, background: "#fff" } }).png().toBuffer(),
      );
      const panels = await cropPanels(blank, id);
      expect(panels).toHaveLength(count);
      for (const p of panels) {
        expect(p.width).toBeGreaterThan(0);
        expect((await sharp(p.image).metadata()).format).toBe("webp");
      }
    },
  );

  it("memotong tepat pada panel hasil deteksi", async () => {
    const page = await pageWith([
      { x: 0.06, y: 0.06, w: 0.88, h: 0.42 },
      { x: 0.06, y: 0.52, w: 0.42, h: 0.42 },
      { x: 0.52, y: 0.52, w: 0.42, h: 0.42 },
    ]);
    const panels = await cropPanels(page, "3-satu-atas-dua-bawah");
    expect(panels).toHaveLength(3);
    // isi panel hanya warna krem: tidak ada piksel putih (margin) atau gelap (bingkai) di tepi
    for (const p of panels) {
      const { data } = await sharp(p.image).raw().toBuffer({ resolveWithObject: true });
      expect(data[0]).toBeGreaterThan(200);
      expect(data[2]).toBeLessThan(200); // krem, bukan putih
    }
  });
});
