import { describe, expect, it } from "vitest";
import { rapikanMask } from "./rapikan-mask";

const W = 100;
const H = 100;

function gambar(f: (x: number, y: number) => number) {
  const a = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) a[y * W + x] = f(x, y);
  return a;
}
const di = (m: Uint8Array, x: number, y: number) => m[y * W + x];

describe("rapikanMask", () => {
  it("mengisi lubang kecil di dalam tokoh", () => {
    const m = rapikanMask(gambar((x, y) => (x < 4 || x > 60 || y < 4 || y > 60 ? 0 : x > 30 && x < 38 && y > 30 && y < 38 ? 0 : 255)), W, H);
    expect(di(m, 34, 34)).toBeGreaterThan(240);
  });
  it("menutup celah sempit alpha rendah (baju putih)", () => {
    const m = rapikanMask(gambar((x, y) => (x < 20 || x > 70 || y < 20 || y > 70 ? 0 : x === 45 ? 20 : 255)), W, H);
    expect(di(m, 45, 45)).toBeGreaterThan(240);
  });
  it("membuang serpihan kecil yang terpisah", () => {
    const m = rapikanMask(gambar((x, y) => ((x > 10 && x < 70 && y > 10 && y < 70) || (x > 90 && x < 93 && y > 90 && y < 93) ? 255 : 0)), W, H);
    expect(di(m, 91, 91)).toBe(0);
    expect(di(m, 40, 40)).toBe(255);
  });
  it("tidak mengisi latar luas yang terkurung", () => {
    // cincin tebal dengan rongga besar di tengah (mis. lengan melingkar)
    const m = rapikanMask(gambar((x, y) => (Math.hypot(x - 50, y - 50) < 45 && Math.hypot(x - 50, y - 50) > 25 ? 255 : 0)), W, H);
    expect(di(m, 50, 50)).toBe(0);
  });
  it("mask kosong tetap kosong", () => {
    expect(rapikanMask(new Uint8Array(W * H), W, H).every((v) => v === 0)).toBe(true);
  });
});
