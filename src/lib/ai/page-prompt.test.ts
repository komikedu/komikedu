import { describe, expect, it } from "vitest";
import { buildPagePrompt } from "./page-prompt";

const req = {
  gaya: "kartun cerah",
  karakter: [{ nama: "Kiki", deskripsi: "anak perempuan, rambut dikuncir dua" }],
  panels: [
    { adegan: "Kiki di depan toko kue", karakter: ["Kiki"], rect: { x: 0.06, y: 0.05, w: 0.88, h: 0.43 } },
    { adegan: "Close-up lampu merah", karakter: [], rect: { x: 0.06, y: 0.52, w: 0.42, h: 0.43 } },
  ],
};

describe("buildPagePrompt", () => {
  it("menyebut setiap panel dengan posisi dan adegannya", () => {
    const p = buildPagePrompt(req);
    expect(p).toContain("2 panel");
    expect(p).toContain("Panel 1 (kiri 6%, atas 5%, lebar 88%, tinggi 43% dari halaman): Kiki di depan toko kue Karakter: Kiki.");
    expect(p).toContain("Panel 2 (kiri 6%, atas 52%, lebar 42%, tinggi 43% dari halaman): Close-up lampu merah");
  });

  it("selalu melarang teks di gambar dan menyertakan deskripsi karakter", () => {
    const p = buildPagePrompt(req);
    expect(p).toMatch(/jangan gambar teks/i);
    expect(p).toMatch(/papan nama toko.*POLOS/i);
    expect(p).toContain("- Kiki: anak perempuan, rambut dikuncir dua");
    expect(p).not.toContain("gambar referensi");
  });

  it("menyebut gambar referensi bila dilampirkan", () => {
    expect(buildPagePrompt({ ...req, referenceImages: [{ data: new Uint8Array(1), mimeType: "image/webp" }] })).toContain("gambar referensi");
  });

  it("menolak halaman tanpa panel", () => {
    expect(() => buildPagePrompt({ ...req, panels: [] })).toThrow();
  });
});
