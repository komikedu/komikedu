import { afterEach, describe, expect, it, vi } from "vitest";
import { bacaHalamanAktif, simpanHalamanAktif } from "./halaman-aktif";

function pasangPenyimpanan(awal: Record<string, string> = {}) {
  const data = { ...awal };
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => data[k] ?? null,
      setItem: (k: string, v: string) => void (data[k] = v),
    },
  });
  return data;
}

afterEach(() => vi.unstubAllGlobals());

describe("halaman aktif", () => {
  it("menyimpan per komik dan membacanya kembali", () => {
    pasangPenyimpanan();
    simpanHalamanAktif("c1", "p3");
    simpanHalamanAktif("c2", "x1");
    expect(bacaHalamanAktif("c1", ["p1", "p2", "p3"])).toBe("p3");
    expect(bacaHalamanAktif("c2", ["x1"])).toBe("x1");
  });
  it("null bila halamannya sudah tidak ada atau belum pernah disimpan", () => {
    pasangPenyimpanan();
    expect(bacaHalamanAktif("c1", ["p1"])).toBeNull();
    simpanHalamanAktif("c1", "p9");
    expect(bacaHalamanAktif("c1", ["p1", "p2"])).toBeNull();
  });
  it("tidak melempar galat saat penyimpanan peramban diblokir", () => {
    vi.stubGlobal("window", {
      get localStorage(): never {
        throw new Error("diblokir");
      },
    });
    expect(() => simpanHalamanAktif("c1", "p1")).not.toThrow();
    expect(bacaHalamanAktif("c1", ["p1"])).toBeNull();
  });
});
