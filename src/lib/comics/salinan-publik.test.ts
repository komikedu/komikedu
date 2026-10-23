import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const simpanGambar = vi.fn(async () => "https://img.test/x");
vi.mock("@/lib/storage/gambar", () => ({ simpanGambar: (...a: unknown[]) => simpanGambar(...(a as [])) }));

const { galatHalamanJpeg, kunciHalamanRilis, simpanHalamanRilis, MAX_BYTES_HALAMAN } = await import("./salinan-publik");

const RILIS = "11111111-1111-4111-8111-111111111111";
const jpeg = (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 3, background: "#fff" } }).jpeg().toBuffer();
const pengguna = (milik: boolean) =>
  ({ from: () => { const q: Record<string, unknown> = {}; for (const k of ["select", "eq"]) q[k] = () => q; q.maybeSingle = async () => ({ data: milik ? { id: "c1", user_id: "u1" } : null }); return q; } }) as never;

describe("galatHalamanJpeg", () => {
  it("menerima JPEG 3:4 berukuran wajar dan menolak sisanya", () => {
    expect(galatHalamanJpeg({ format: "jpeg", width: 1350, height: 1800 })).toBeNull();
    expect(galatHalamanJpeg({ format: "png", width: 1350, height: 1800 })).toMatch(/JPEG/);
    expect(galatHalamanJpeg({ format: "jpeg", width: 1800, height: 1800 })).toMatch(/3:4/);
    expect(galatHalamanJpeg({ format: "jpeg", width: 100, height: 133 })).toMatch(/tidak wajar/);
    expect(galatHalamanJpeg({ format: "jpeg", width: 9000, height: 12000 })).toMatch(/tidak wajar/);
    expect(galatHalamanJpeg(null)).toMatch(/JPEG/);
  });
});

describe("simpanHalamanRilis", () => {
  it("menyimpan halaman JPEG valid di kunci khusus penerbitan", async () => {
    simpanGambar.mockClear();
    const bytes = new Uint8Array(await jpeg(900, 1200));
    expect(await simpanHalamanRilis(pengguna(true), {} as never, "u1", "c1", RILIS, 2, bytes)).toEqual({ ok: true });
    expect(simpanGambar).toHaveBeenCalledWith({}, kunciHalamanRilis("u1", "c1", RILIS, 2), bytes, "image/jpeg");
    expect(kunciHalamanRilis("u1", "c1", RILIS, 2)).toBe(`u1/c1/rilis-${RILIS}-2.jpg`);
  });

  it("menolak komik orang lain, nomor atau id tak valid, berkas kosong atau terlalu besar, dan bukan JPEG", async () => {
    simpanGambar.mockClear();
    const bytes = new Uint8Array(await jpeg(900, 1200));
    expect(await simpanHalamanRilis(pengguna(false), {} as never, "u1", "c1", RILIS, 1, bytes)).toMatchObject({ ok: false, status: 404 });
    expect(await simpanHalamanRilis(pengguna(true), {} as never, "u1", "c1", "bukan-uuid", 1, bytes)).toMatchObject({ ok: false, status: 400 });
    for (const nomor of [0, 31, 1.5]) expect(await simpanHalamanRilis(pengguna(true), {} as never, "u1", "c1", RILIS, nomor, bytes)).toMatchObject({ ok: false, status: 400 });
    expect(await simpanHalamanRilis(pengguna(true), {} as never, "u1", "c1", RILIS, 1, new Uint8Array())).toMatchObject({ ok: false, status: 413 });
    expect(await simpanHalamanRilis(pengguna(true), {} as never, "u1", "c1", RILIS, 1, new Uint8Array(MAX_BYTES_HALAMAN + 1))).toMatchObject({ ok: false, status: 413 });
    expect(await simpanHalamanRilis(pengguna(true), {} as never, "u1", "c1", RILIS, 1, new Uint8Array([1, 2, 3, 4]))).toMatchObject({ ok: false, status: 400 });
    const png = new Uint8Array(await sharp({ create: { width: 900, height: 1200, channels: 3, background: "#fff" } }).png().toBuffer());
    expect(await simpanHalamanRilis(pengguna(true), {} as never, "u1", "c1", RILIS, 1, png)).toMatchObject({ ok: false, status: 400 });
    expect(simpanGambar).not.toHaveBeenCalled();
  });
});
