import { describe, expect, it } from "vitest";
import { isAdminEmail } from "./admin";
import { ringkasPemakaian, tanggalWib } from "./admin-usage";

describe("isAdminEmail", () => {
  it("cocok tanpa peduli huruf besar dan spasi", () => {
    expect(isAdminEmail("Info@Agensoal.com", " a@b.id , info@agensoal.com")).toBe(true);
  });

  it("menolak email lain, kosong, atau daftar kosong", () => {
    expect(isAdminEmail("x@b.id", "a@b.id")).toBe(false);
    expect(isAdminEmail(null, "a@b.id")).toBe(false);
    expect(isAdminEmail("a@b.id", "")).toBe(false);
    expect(isAdminEmail("", ",")).toBe(false);
  });
});

describe("ringkasPemakaian", () => {
  const now = new Date("2026-10-23T10:00:00Z");

  it("merangkum per model dan per hari WIB", () => {
    const { perModel, perHari, total } = ringkasPemakaian(
      [
        { provider: "gemini", model: "gemini-nano-banana-2.1", jenis: "gambar", status: "selesai", biaya: "0.05", created_at: "2026-10-23T01:00:00Z" },
        { provider: "gemini", model: "gemini-nano-banana-2.1", jenis: "gambar", status: "gagal", biaya: 0.01, created_at: "2026-10-22T18:00:00Z" },
        { provider: "cloudflare", model: "@cf/x", jenis: "gambar", status: "selesai", biaya: 0.001, created_at: "2026-10-10T00:00:00Z" },
        { provider: "gemini", model: null, jenis: "naskah", status: "selesai", biaya: null, created_at: "2026-10-23T00:00:00Z" },
      ],
      now,
    );
    expect(total).toBeCloseTo(0.061);
    expect(perModel[0]).toMatchObject({ provider: "gemini", model: "gemini-nano-banana-2.1", panggilan: 2, gagal: 1 });
    expect(perModel.find((m) => m.model === "(tidak tercatat)")?.panggilan).toBe(1);
    expect(perHari).toHaveLength(7);
    // 22 Okt 18:00 UTC sudah 23 Okt WIB, jadi tiga panggilan jatuh di hari ini; 10 Okt di luar 7 hari
    expect(perHari.at(-1)).toMatchObject({ tanggal: "2026-10-23", panggilan: 3 });
    expect(perHari.reduce((s, h) => s + h.panggilan, 0)).toBe(3);
  });

  it("tanggalWib menggeser ke UTC+7", () => {
    expect(tanggalWib("2026-10-22T17:00:00Z")).toBe("2026-10-23");
    expect(tanggalWib("2026-10-22T16:59:00Z")).toBe("2026-10-22");
  });
});

describe("bacaTambahKredit", () => {
  const uid = "6f4e8c02-e6c5-4739-95f9-405c8083cc7c";

  it("menerima isian yang benar dan merapikan catatan", async () => {
    const { bacaTambahKredit } = await import("./admin");
    expect(bacaTambahKredit({ userId: uid, jumlah: "25", catatan: "  bonus \n uji   coba " })).toEqual({ ok: true, userId: uid, jumlah: 25, catatan: "bonus uji coba" });
    expect(bacaTambahKredit({ userId: uid, jumlah: 1, catatan: undefined })).toMatchObject({ ok: true, catatan: "" });
  });

  it("menolak jumlah di luar batas, pecahan, bukan angka, dan id pengguna palsu", async () => {
    const { bacaTambahKredit, MAX_TAMBAH_KREDIT } = await import("./admin");
    for (const jumlah of [0, -5, 1.5, "abc", MAX_TAMBAH_KREDIT + 1, null, ""]) {
      expect(bacaTambahKredit({ userId: uid, jumlah, catatan: "" }).ok).toBe(false);
    }
    expect(bacaTambahKredit({ userId: "", jumlah: 5, catatan: "" }).ok).toBe(false);
    expect(bacaTambahKredit({ userId: "1; drop table users", jumlah: 5, catatan: "" }).ok).toBe(false);
    expect(bacaTambahKredit({ userId: uid, jumlah: 5, catatan: "x".repeat(101) }).ok).toBe(false);
  });
});
