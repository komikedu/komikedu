import { describe, expect, it } from "vitest";
import { MAKS_NAMA, MAKS_SEKOLAH, PERAN, ProfilSchema, rapikan } from "./profil";

describe("rapikan", () => {
  it("meratakan spasi, membuang karakter kontrol, dan memotong ujung", () => {
    expect(rapikan("  Bu   Rina \n\t Wati  ")).toBe("Bu Rina Wati");
    expect(rapikan("A\u0000B\u0007C")).toBe("A B C");
    expect(rapikan("   ")).toBe("");
  });
});

describe("ProfilSchema", () => {
  it("menerima isian lengkap dan merapikannya", () => {
    expect(ProfilSchema.parse({ nama: "  Bu  Rina ", peran: "guru", sekolah: "  SDN 1   Merdeka " })).toEqual({ nama: "Bu Rina", peran: "guru", sekolah: "SDN 1 Merdeka" });
  });
  it("peran dan sekolah kosong disimpan null", () => {
    expect(ProfilSchema.parse({ nama: "Rina", peran: "", sekolah: "   " })).toEqual({ nama: "Rina", peran: null, sekolah: null });
    expect(ProfilSchema.parse({ nama: "Rina", peran: null, sekolah: null })).toEqual({ nama: "Rina", peran: null, sekolah: null });
    expect(ProfilSchema.parse({ nama: "Rina" })).toEqual({ nama: "Rina", peran: null, sekolah: null });
  });
  it("nama wajib dan dibatasi panjangnya", () => {
    expect(ProfilSchema.safeParse({ nama: "   ", peran: null, sekolah: null }).success).toBe(false);
    expect(ProfilSchema.safeParse({ nama: "x".repeat(MAKS_NAMA), peran: null, sekolah: null }).success).toBe(true);
    const lebih = ProfilSchema.safeParse({ nama: "x".repeat(MAKS_NAMA + 1), peran: null, sekolah: null });
    expect(lebih.success).toBe(false);
    expect(!lebih.success && lebih.error.issues[0].message).toContain("maksimal");
  });
  it("sekolah dibatasi panjangnya", () => {
    expect(ProfilSchema.safeParse({ nama: "Rina", peran: null, sekolah: "s".repeat(MAKS_SEKOLAH + 1) }).success).toBe(false);
  });
  it("hanya peran yang dikenal database yang diterima", () => {
    for (const p of PERAN) expect(ProfilSchema.safeParse({ nama: "Rina", peran: p.id, sekolah: null }).success).toBe(true);
    expect(ProfilSchema.safeParse({ nama: "Rina", peran: "admin", sekolah: null }).success).toBe(false);
  });
  it("hanya tiga kolom yang boleh ditulis: nama, peran, sekolah", () => {
    const hasil = ProfilSchema.parse({ nama: "Rina", peran: "guru", sekolah: null, saldo_kredit: 9999, id: "x" } as never);
    expect(Object.keys(hasil).sort()).toEqual(["nama", "peran", "sekolah"]);
  });
});
