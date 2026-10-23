import { describe, expect, it } from "vitest";
import { gayaGambar, gayaPanel, halamanThumb } from "./thumb";

describe("thumbnail halaman 1", () => {
  it("menghitung posisi panel dalam persen halaman", () => {
    expect(gayaPanel({ x: 90, y: 120, w: 450, h: 600, imageUrl: null })).toMatchObject({ left: "10%", top: "10%", width: "50%", height: "50%" });
  });

  it("panel miring memakai clip-path relatif terhadap kotak panel", () => {
    const g = gayaPanel({ x: 0, y: 0, w: 100, h: 100, corners: [{ x: 0, y: 0 }, { x: 100, y: 10 }, { x: 100, y: 100 }, { x: 0, y: 90 }], imageUrl: null });
    expect(g.clipPath).toBe("polygon(0% 0%, 100% 10%, 100% 100%, 0% 90%)");
  });

  it("gambar memenuhi panel kecuali guru mengatur posisinya", () => {
    const p = { x: 100, y: 100, w: 200, h: 200, imageUrl: "u" };
    expect(gayaGambar(p)).toEqual({ left: "0%", top: "0%", width: "100%", height: "100%" });
    expect(gayaGambar({ ...p, gambar: { x: 50, y: 100, w: 300, h: 200 } })).toEqual({ left: "-25%", top: "0%", width: "150%", height: "100%" });
  });

  it("null bila tidak ada panel bergambar; panel disembunyikan dilewati dan urut", () => {
    const r = (urutan: number, image_url: string | null, tampil = true) => ({ urutan, image_url, tampil, posisi: { x: urutan, y: 0, w: 10, h: 10 } });
    expect(halamanThumb([r(1, null)])).toBeNull();
    expect(halamanThumb(undefined)).toBeNull();
    const h = halamanThumb([r(2, "b"), r(3, "x", false), r(1, "a")])!;
    expect(h.panels.map((p) => p.imageUrl)).toEqual(["a", "b"]);
  });
});
