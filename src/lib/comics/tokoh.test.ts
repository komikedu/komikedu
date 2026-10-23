import { describe, expect, it } from "vitest";
import { TOKOH_PRESET, fromPreset, sheetCocok } from "./tokoh";

describe("sheetCocok", () => {
  const sari = fromPreset(TOKOH_PRESET.find((t) => t.id === "sari")!);
  const doni = fromPreset(TOKOH_PRESET.find((t) => t.id === "doni")!);
  const sheet = [sari, doni, { nama: "Pak Satpam", deskripsi: "pria berseragam biru" }].map(({ nama, deskripsi }) => ({ nama, deskripsi }));

  it("cocok bila semua tokoh pilihan ada dengan deskripsi sama (tokoh tambahan di lembar boleh)", () => {
    expect(sheetCocok(sheet, [sari, doni])).toBe(true);
    expect(sheetCocok(sheet, [])).toBe(true);
  });

  it("tidak cocok bila tokoh baru ditambahkan atau deskripsinya diubah", () => {
    const kiki = fromPreset(TOKOH_PRESET.find((t) => t.id === "kiki")!);
    expect(sheetCocok(sheet, [sari, kiki])).toBe(false);
    expect(sheetCocok(sheet, [{ ...sari, deskripsi: "anak perempuan berambut pendek" }])).toBe(false);
  });
});
