import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { perkiraanNeuron, ukuranGenerate } = await import("./cloudflare-image");
const { buildPanelPrompt } = await import("./page-prompt");

describe("ukuranGenerate", () => {
  it("sisi terpanjang 1024 dan kelipatan 16", () => {
    expect(ukuranGenerate(3, 4)).toEqual({ width: 768, height: 1024 });
    expect(ukuranGenerate(1000, 300)).toEqual({ width: 1024, height: 304 });
  });

  it("tidak di bawah batas minimal model", () => {
    expect(ukuranGenerate(2000, 100).height).toBe(256);
  });
});

describe("perkiraanNeuron", () => {
  it("menghitung tile output dan gambar input", () => {
    // 768x1024 = 2x2 tile output, ditambah 2 gambar referensi
    expect(perkiraanNeuron(768, 1024, 2)).toBeCloseTo(4 * 26.05 + 2 * 5.37);
  });
});

describe("buildPanelPrompt", () => {
  it("hanya menyebut tokoh yang tampil dan menomori referensi dari 0", () => {
    const prompt = buildPanelPrompt(
      { adegan: "Kiki menunjuk lampu merah.", karakter: ["kiki"], rect: { x: 0, y: 0, w: 1, h: 1 } },
      {
        gaya: "kartun cerah",
        karakter: [
          { nama: "Kiki", deskripsi: "rambut kuncir dua" },
          { nama: "Doni", deskripsi: "kacamata bulat" },
        ],
        referenceImages: [{ data: new Uint8Array(), mimeType: "image/png", label: "potret tokoh Kiki" }],
      },
    );
    expect(prompt).toContain("Kiki: rambut kuncir dua");
    expect(prompt).not.toContain("Doni");
    expect(prompt).toContain("image 0 = potret tokoh Kiki");
  });
});
