import { describe, expect, it } from "vitest";
import { KUNCI_BASI_MS, ambilKunci, syaratKunciBebas } from "./kunci-generate";

describe("kunci pembuatan gambar", () => {
  const sekarang = new Date("2026-10-23T10:00:00.000Z");

  it("mengambil kunci mencatat status dan waktu mulai", () => {
    expect(ambilKunci(sekarang)).toEqual({ status: "generating", generating_sejak: "2026-10-23T10:00:00.000Z" });
  });

  it("filter membolehkan panel bebas, tanpa waktu mulai, atau yang kuncinya lebih tua dari batas", () => {
    expect(KUNCI_BASI_MS).toBe(300_000);
    expect(syaratKunciBebas(sekarang)).toBe("status.neq.generating,generating_sejak.is.null,generating_sejak.lt.2026-10-23T09:55:00.000Z");
  });
});
