import { describe, expect, it, vi } from "vitest";
import { TerbitSchema } from "./komunitas-schema";
import { adaFilter, bacaFilter, namaBahasa, namaTema, urlKomunitas } from "./klasifikasi";

describe("bacaFilter", () => {
  it("menerima nilai yang dikenal", () => {
    expect(bacaFilter({ jenjang: "5", tema: "pecahan", bahasa: "inggris" })).toEqual({ jenjang: 5, tema: "pecahan", bahasa: "inggris" });
  });
  it("mengabaikan nilai tidak dikenal atau kosong, tanpa galat", () => {
    expect(bacaFilter({ jenjang: "9", tema: "../x", bahasa: "klingon" })).toEqual({});
    expect(bacaFilter({ jenjang: "abc" })).toEqual({});
    expect(bacaFilter({})).toEqual({});
  });
  it("memakai nilai pertama bila parameter berulang", () => {
    expect(bacaFilter({ jenjang: ["3", "4"], tema: ["waktu", "data"] })).toEqual({ jenjang: 3, tema: "waktu" });
  });
});

describe("urlKomunitas", () => {
  it("menyusun alamat dengan filter dan nomor halaman; halaman 1 tidak ditulis", () => {
    expect(urlKomunitas({})).toBe("/komunitas");
    expect(urlKomunitas({ jenjang: 5, tema: "pecahan" })).toBe("/komunitas?jenjang=5&tema=pecahan");
    expect(urlKomunitas({ bahasa: "daerah" }, 3)).toBe("/komunitas?bahasa=daerah&halaman=3");
    expect(urlKomunitas({}, 2)).toBe("/komunitas?halaman=2");
  });
  it("hasil bacaFilter dari alamat yang disusun sama dengan filter awal", () => {
    const f = { jenjang: 2, tema: "geometri", bahasa: "indonesia" } as const;
    const q = Object.fromEntries(new URL(urlKomunitas(f, 4), "http://x").searchParams);
    expect(bacaFilter(q)).toEqual(f);
  });
});

describe("adaFilter dan nama", () => {
  it("mengenali filter aktif", () => {
    expect(adaFilter({})).toBe(false);
    expect(adaFilter({ jenjang: 1 })).toBe(true);
    expect(adaFilter({ tema: "data" })).toBe(true);
  });
  it("nama tema dan bahasa untuk tampilan", () => {
    expect(namaTema("pecahan")).toBe("Pecahan dan desimal");
    expect(namaTema(null)).toBeNull();
    expect(namaBahasa("daerah")).toBe("Daerah");
  });
});

describe("TerbitSchema dengan tema dan bahasa", () => {
  const dasar = { setuju: true, rilis: "11111111-1111-4111-8111-111111111111", jumlah: 2 };
  it("tema dan bahasa bawaan: Lainnya dan Indonesia", () => {
    expect(TerbitSchema.parse(dasar)).toMatchObject({ tema: "lainnya", bahasa: "indonesia" });
  });
  it("menolak tema atau bahasa yang tidak dikenal", () => {
    expect(TerbitSchema.safeParse({ ...dasar, tema: "bebas" }).success).toBe(false);
    expect(TerbitSchema.safeParse({ ...dasar, bahasa: "klingon" }).success).toBe(false);
    expect(TerbitSchema.parse({ ...dasar, tema: "waktu", bahasa: "inggris" })).toMatchObject({ tema: "waktu", bahasa: "inggris" });
  });
});

describe("daftarTerbit menerapkan filter", () => {
  it("meneruskan jenjang, tema, dan bahasa ke query; tanpa filter tidak ada saringan tambahan", async () => {
    vi.doMock("server-only", () => ({}));
    vi.doMock("@/lib/storage/gambar", () => ({ adaBerkas: vi.fn(), bersihkanRilis: vi.fn(), hapusGambar: vi.fn(), urlGambar: vi.fn(), kunciKomik: () => null }));
    const { daftarTerbit } = await import("./komunitas");
    const dipanggil: [string, unknown][] = [];
    const q: Record<string, unknown> = {};
    for (const k of ["select", "not", "order", "range"]) q[k] = () => q;
    q.eq = (kolom: string, nilai: unknown) => (dipanggil.push([kolom, nilai]), q);
    q.then = (ok: (v: unknown) => unknown) => ok({ data: [], error: null });
    const admin = { from: () => q } as never;

    await daftarTerbit(admin, 1, { jenjang: 4, tema: "waktu", bahasa: "daerah" });
    expect(dipanggil).toEqual([["is_public", true], ["status", "terbit"], ["jenjang", 4], ["tema", "waktu"], ["bahasa", "daerah"]]);

    dipanggil.length = 0;
    await daftarTerbit(admin, 1);
    expect(dipanggil).toEqual([["is_public", true], ["status", "terbit"]]);
  });
});
