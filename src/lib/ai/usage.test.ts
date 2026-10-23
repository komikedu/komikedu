import { describe, expect, it } from "vitest";
import { barisGenerations, catatPemakaian, hitungPemakaian, rekamPemakaian, type Pemakaian } from "./usage";

describe("hitungPemakaian", () => {
  it("memisahkan tarif token gambar dari teks dan berpikir", () => {
    const p = hitungPemakaian("gemini-3.1-flash-image", {
      promptTokenCount: 2000,
      candidatesTokenCount: 1120,
      thoughtsTokenCount: 200,
      candidatesTokensDetails: [{ modality: "IMAGE", tokenCount: 1120 }],
    });
    expect(p).toEqual({ model: "gemini-3.1-flash-image", input_tokens: 2000, output_tokens: 1320, biaya: 0.0688 });
  });

  it("biaya null untuk model tanpa tarif", () => {
    expect(hitungPemakaian("model-lain", { promptTokenCount: 10 }).biaya).toBeNull();
  });
});

describe("rekamPemakaian", () => {
  it("mengumpulkan pemakaian walau fungsi gagal", async () => {
    const log: Pemakaian[] = [];
    await expect(
      rekamPemakaian(log, async () => {
        catatPemakaian("gemini-3.5-flash", { promptTokenCount: 100, candidatesTokenCount: 50 });
        throw new Error("gagal");
      }),
    ).rejects.toThrow("gagal");
    expect(log).toHaveLength(1);
    expect(barisGenerations(log, { jenis: "naskah" })[0]).toMatchObject({ jenis: "naskah", model: "gemini-3.5-flash", input_tokens: 100 });
  });

  it("satu baris tanpa token bila tidak ada panggilan", () => {
    expect(barisGenerations([], { jenis: "gambar" })).toEqual([{ jenis: "gambar" }]);
  });
});
