import { describe, expect, it } from "vitest";
import { ringkasSusunan } from "@/lib/comics/susunan";

const dasar = { jumlahHalaman: 8, panelPerHalaman: 3, sampul: false, lebar: 900, tinggi: 1200 };

describe("ringkasSusunan", () => {
  it("angka tetap", () => {
    expect(ringkasSusunan(dasar)).toBe("8 halaman · 3 panel per halaman · halaman 900 x 1200");
  });
  it("sampul ditambahkan di depan", () => {
    expect(ringkasSusunan({ ...dasar, sampul: true })).toBe("Sampul + 8 halaman · 3 panel per halaman · halaman 900 x 1200");
  });
  it("otomatis untuk halaman dan panel", () => {
    const r = ringkasSusunan({ ...dasar, jumlahHalaman: null, panelPerHalaman: null });
    expect(r).toContain("4 sampai 12 halaman (AI menyesuaikan dengan ceritamu)");
    expect(r).toContain("2 sampai 4 panel per halaman");
  });
  it("satu panel penuh", () => {
    expect(ringkasSusunan({ ...dasar, panelPerHalaman: 1 })).toContain("1 panel penuh per halaman");
  });
  it("rentang panel", () => {
    expect(ringkasSusunan({ ...dasar, panelPerHalaman: 2, panelMaks: 6 })).toContain("2 sampai 6 panel per halaman");
    // batas atas tidak lebih besar dari batas bawah dianggap jumlah tetap
    expect(ringkasSusunan({ ...dasar, panelPerHalaman: 3, panelMaks: 3 })).toContain("3 panel per halaman");
  });
});
