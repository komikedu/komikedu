import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const simpan = vi.fn(async (_a: unknown, key: string, _data: Buffer, _tipe: string) => `https://cdn/${key}`);
vi.mock("@/lib/storage/gambar", () => ({ simpanGambar: simpan }));

const { simpanStiker } = await import("./stiker");

const milik = (ada: boolean) => ({ from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: ada ? { id: "c1" } : null }) }) }) }) }) }) as never;
const png = (w = 40, h = 20) => sharp({ create: { width: w, height: h, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();

describe("simpanStiker", () => {
  it("menyimpan WebP transparan di folder komik pemilik", async () => {
    const res = await simpanStiker(milik(true), {} as never, "u1", "c1", await png());
    expect(res.ok).toBe(true);
    const [, key, data, tipe] = simpan.mock.calls.at(-1) as unknown as [unknown, string, Buffer, string];
    expect(key).toMatch(/^u1\/c1\/stiker-\d+\.webp$/);
    expect(tipe).toBe("image/webp");
    const meta = await sharp(data).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.hasAlpha).toBe(true);
  });
  it("mengecilkan gambar yang terlalu besar", async () => {
    await simpanStiker(milik(true), {} as never, "u1", "c1", await png(3000, 1000));
    const data = simpan.mock.calls.at(-1)![2];
    expect((await sharp(data).metadata()).width).toBe(1536);
  });
  it("menolak komik orang lain, berkas bukan gambar, dan berkas kosong", async () => {
    expect(await simpanStiker(milik(false), {} as never, "u1", "c1", await png())).toMatchObject({ ok: false, status: 404 });
    expect(await simpanStiker(milik(true), {} as never, "u1", "c1", new TextEncoder().encode("bukan gambar"))).toMatchObject({ ok: false, status: 400 });
    expect(await simpanStiker(milik(true), {} as never, "u1", "c1", new Uint8Array())).toMatchObject({ ok: false, status: 400 });
  });
});
