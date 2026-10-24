import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GAYA } from "./schema";
import { promptTokohSalin } from "./prompt-tokoh";

describe("promptTokohSalin", () => {
  const tokoh = { nama: "Kancil", deskripsi: "kancil kecil cokelat" };

  it("memuat data tokoh dan rasio sesuai bentuk", () => {
    const p = promptTokohSalin(tokoh, "anime-lembut", "potret");
    expect(p).toContain("Nama: Kancil");
    expect(p).toContain("kancil kecil cokelat");
    expect(p).toContain("1:1");
    expect(p).toContain("orisinal");
  });

  it("badan penuh minta seluruh tubuh dengan rasio tegak, gaya kosong memakai gaya pertama", () => {
    const p = promptTokohSalin(tokoh, null, "badan");
    expect(p).toContain("Seluruh tubuh");
    expect(p).toContain("3:4");
    expect(p).toContain("buku cerita anak");
  });

  it("tidak memuat istilah genre atau produk media yang memicu penolakan, untuk semua gaya", () => {
    for (const g of GAYA) {
      for (const bentuk of ["potret", "badan"] as const) {
        expect(promptTokohSalin(tokoh, g.id, bentuk), g.id).not.toMatch(/sitkom|sitcom|serial|anime|manga|kawaii|game|disney|ghibli|pixar/i);
      }
    }
  });
});
