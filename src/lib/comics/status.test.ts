import { describe, expect, it } from "vitest";
import { nextStep, waktuRelatif, type ComicSummary } from "./status";

const comic = (o: Partial<ComicSummary> = {}): ComicSummary => ({
  id: "c1",
  judul: "KPK",
  jenjang: 5,
  status: "draft",
  naskah_status: "none",
  topik: null,
  gaya: null,
  adaMateri: false,
  created_at: "2026-10-23T00:00:00Z",
  ...o,
});

describe("nextStep", () => {
  it("draft belum lengkap mengarah ke pengaturan", () => {
    expect(nextStep(comic())).toMatchObject({ badge: "Draft", href: "/comics/c1/wizard" });
    expect(nextStep(comic({ topik: "KPK" }))).toMatchObject({ href: "/comics/c1/wizard" }); // belum pilih gaya
    expect(nextStep(comic({ topik: "   ", gaya: "kartun-cerah" }))).toMatchObject({ href: "/comics/c1/wizard" });
  });

  it("draft lengkap (topik atau PDF, plus gaya) mengarah ke langkah cerita untuk membuat naskah", () => {
    expect(nextStep(comic({ topik: "KPK", gaya: "kartun-cerah" }))).toMatchObject({ href: "/comics/c1/wizard?langkah=4" });
    expect(nextStep(comic({ adaMateri: true, gaya: "anime-lembut" }))).toMatchObject({ href: "/comics/c1/wizard?langkah=4" });
  });

  it("status naskah menentukan badge dan tujuan", () => {
    expect(nextStep(comic({ naskah_status: "generating" }))).toMatchObject({ tone: "progress", href: "/comics/c1/naskah" });
    expect(nextStep(comic({ naskah_status: "review" }))).toMatchObject({ badge: "Tinjau naskah", tone: "attention" });
    expect(nextStep(comic({ naskah_status: "error" }))).toMatchObject({ aksi: "Coba lagi", tone: "attention", href: "/comics/c1/wizard?langkah=4" });
    expect(nextStep(comic({ naskah_status: "approved" }))).toMatchObject({ badge: "Di editor", href: "/comics/c1/editor" });
  });

  it("komik terbit selalu ke editor", () => {
    expect(nextStep(comic({ status: "terbit", naskah_status: "approved" }))).toMatchObject({ badge: "Terbit", tone: "done" });
  });
});

describe("waktuRelatif", () => {
  const now = new Date("2026-10-23T12:00:00Z");
  it("format bahasa Indonesia", () => {
    expect(waktuRelatif("2026-10-23T11:59:50Z", now)).toBe("baru saja");
    expect(waktuRelatif("2026-10-23T11:55:00Z", now)).toBe("5 menit yang lalu");
    expect(waktuRelatif("2026-10-23T09:00:00Z", now)).toBe("3 jam yang lalu");
    expect(waktuRelatif("2026-10-22T12:00:00Z", now)).toBe("kemarin");
  });
});
