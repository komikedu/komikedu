import { beforeEach, describe, expect, it, vi } from "vitest";
import { LaporSchema, PerbaruiDeskripsiSchema, TerbitSchema, adaGambarUntukTerbit, nomorHalaman } from "./komunitas-schema";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/storage/gambar", () => ({
  adaBerkas: vi.fn(async () => true),
  bersihkanRilis: vi.fn(async () => undefined),
  hapusGambar: vi.fn(async () => undefined),
  urlGambar: (_a: unknown, key: string) => `https://img.test/${key}`,
  kunciKomik: (url: string | null, userId: string, comicId: string) => {
    const key = url?.startsWith("https://img.test/") ? url.slice("https://img.test/".length) : null;
    return key?.startsWith(`${userId}/${comicId}/`) ? key : null;
  },
}));

const { ringkasLaporan, terbitkanKomik, laporkanKomik, tarikKomik, bacaKomikPublik } = await import("./komunitas");
const { adaBerkas, bersihkanRilis } = await import("@/lib/storage/gambar");

const RILIS = "11111111-1111-4111-8111-111111111111";
const terbit = (o: object = {}) => ({ deskripsi: "Belajar KPK", setuju: true, rilis: RILIS, jumlah: 2, ...o });

describe("skema komunitas", () => {
  it("terbit wajib dengan pernyataan hak cipta dicentang, id penerbitan, dan jumlah halaman", () => {
    expect(TerbitSchema.safeParse(terbit()).success).toBe(true);
    expect(TerbitSchema.safeParse(terbit({ setuju: false })).success).toBe(false);
    expect(TerbitSchema.safeParse({ ...terbit(), setuju: undefined }).success).toBe(false);
    expect(TerbitSchema.safeParse(terbit({ deskripsi: "x".repeat(301) })).success).toBe(false);
    expect(TerbitSchema.safeParse(terbit({ rilis: "bukan-uuid" })).success).toBe(false);
    for (const jumlah of [0, 31, 1.5, "2"]) expect(TerbitSchema.safeParse(terbit({ jumlah })).success).toBe(false);
    expect(TerbitSchema.parse(terbit({ deskripsi: undefined })).deskripsi).toBe("");
    expect(TerbitSchema.parse(terbit({ deskripsi: "  rapi  " })).deskripsi).toBe("rapi");
  });

  it("laporan butuh alasan yang dikenal; catatan kosong menjadi null", () => {
    expect(LaporSchema.safeParse({ alasan: "spam", catatan: "" }).data).toEqual({ alasan: "spam", catatan: null });
    expect(LaporSchema.safeParse({ alasan: "hak-cipta", catatan: " dari buku X " }).data).toEqual({ alasan: "hak-cipta", catatan: "dari buku X" });
    expect(LaporSchema.safeParse({ alasan: "iseng" }).success).toBe(false);
    expect(LaporSchema.safeParse({}).success).toBe(false);
    expect(LaporSchema.safeParse({ alasan: "spam", catatan: "x".repeat(501) }).success).toBe(false);
    expect(PerbaruiDeskripsiSchema.safeParse({ deskripsi: "" }).success).toBe(true);
  });

  it("komik kosong tanpa gambar tidak boleh terbit", () => {
    expect(adaGambarUntukTerbit([])).toBe(false);
    expect(adaGambarUntukTerbit([{ image_url: null }])).toBe(false);
    expect(adaGambarUntukTerbit([{ image_url: "https://x/a.webp", tampil: false }])).toBe(false);
    expect(adaGambarUntukTerbit([{ image_url: null }, { image_url: "https://x/a.webp", tampil: true }])).toBe(true);
  });

  it("nomor halaman aman dari input liar", () => {
    expect(nomorHalaman("3")).toBe(3);
    expect(nomorHalaman(undefined)).toBe(1);
    for (const x of ["0", "-2", "1.5", "abc", "99999999", ""]) expect(nomorHalaman(x)).toBe(1);
    expect(nomorHalaman(["4", "9"])).toBe(4);
  });
});

describe("ringkasLaporan", () => {
  const r = (comic_id: string, alasan: "spam" | "hak-cipta" | "salah", created_at: string, catatan: string | null = null, judul = "Komik") => ({
    comic_id,
    alasan,
    catatan,
    created_at,
    comics: { judul: `${judul} ${comic_id}`, is_public: true },
  });

  it("menggabungkan per komik, urut dari laporan terbanyak, dan membatasi catatan", () => {
    const hasil = ringkasLaporan([
      r("a", "spam", "2026-10-01T00:00:00Z"),
      r("b", "hak-cipta", "2026-10-02T00:00:00Z", "c1"),
      r("b", "hak-cipta", "2026-10-03T00:00:00Z", "c2"),
      r("b", "salah", "2026-10-04T00:00:00Z", "c3"),
      r("b", "salah", "2026-10-05T00:00:00Z", "c4"),
    ]);
    expect(hasil.map((h) => h.comicId)).toEqual(["b", "a"]);
    expect(hasil[0]).toMatchObject({ jumlah: 4, alasan: { "hak-cipta": 2, salah: 2, spam: 0 }, terakhir: "2026-10-05T00:00:00Z" });
    expect(hasil[0].catatan).toEqual(["c1", "c2", "c3"]);
  });

  it("menandai komik yang sudah ditarik atau dihapus", () => {
    const hasil = ringkasLaporan([
      { comic_id: "a", alasan: "spam", catatan: null, created_at: "2026-10-01T00:00:00Z", comics: { judul: "A", is_public: false } },
      { comic_id: "z", alasan: "spam", catatan: null, created_at: "2026-10-01T00:00:00Z", comics: null },
    ]);
    expect(hasil.find((h) => h.comicId === "a")?.terbit).toBe(false);
    expect(hasil.find((h) => h.comicId === "z")?.judul).toBe("(komik dihapus)");
  });
});

/** Klien tiruan sederhana: setiap tabel mengembalikan data tetap dan mencatat update. */
function klien(opsi: { komik?: Record<string, unknown> | null; panels?: unknown[]; updateData?: unknown[] }) {
  const update = vi.fn();
  const upsert = vi.fn(async () => ({ error: null }));
  const c = {
    from: (tabel: string) => {
      const q: Record<string, unknown> = {};
      for (const k of ["select", "eq", "order", "in"]) q[k] = () => q;
      q.maybeSingle = async () => ({ data: tabel === "comics" ? (opsi.komik ?? null) : null });
      q.update = (v: unknown) => (update(v), q);
      q.upsert = upsert;
      q.then = (res: (v: unknown) => unknown) => res({ data: tabel === "panels" ? (opsi.panels ?? []) : (opsi.updateData ?? []), error: null });
      return q;
    },
  } as never;
  return { c, update, upsert };
}

describe("terbitkanKomik", () => {
  const milik = { id: "c1", user_id: "u1", diterbitkan_at: null, halaman_publik: null };
  const adaGambar = [{ image_url: "https://x/a.webp", tampil: true }];

  beforeEach(() => {
    vi.mocked(adaBerkas).mockReset().mockResolvedValue(true);
    vi.mocked(bersihkanRilis).mockClear();
  });

  it("menolak tanpa pernyataan hak cipta, komik orang lain, dan komik tanpa gambar", async () => {
    const a = klien({ komik: milik, panels: adaGambar });
    expect(await terbitkanKomik(a.c, a.c, "u1", "c1", terbit({ setuju: false }))).toMatchObject({ ok: false, status: 400 });
    expect(await terbitkanKomik(a.c, a.c, "u2", "c1", terbit())).toMatchObject({ ok: false, status: 404 });
    const kosong = klien({ komik: milik, panels: [{ image_url: null, tampil: true }] });
    expect(await terbitkanKomik(kosong.c, kosong.c, "u1", "c1", terbit())).toMatchObject({ ok: false, status: 400 });
    expect(kosong.update).not.toHaveBeenCalled();
    expect(a.update).not.toHaveBeenCalled();
  });

  it("menolak bila ada halaman salinan yang belum terunggah", async () => {
    vi.mocked(adaBerkas).mockImplementation(async (_a, key) => !String(key).endsWith("-2.jpg"));
    const a = klien({ komik: milik, panels: adaGambar });
    expect(await terbitkanKomik(a.c, a.c, "u1", "c1", terbit())).toMatchObject({ ok: false, status: 400 });
    expect(a.update).not.toHaveBeenCalled();
    expect(bersihkanRilis).not.toHaveBeenCalled();
  });

  it("menerbitkan dari salinan: status terbit, daftar URL halaman berurutan, dan membuang rilis lain", async () => {
    const a = klien({ komik: milik, panels: adaGambar });
    const res = await terbitkanKomik(a.c, a.c, "u1", "c1", terbit({ jumlah: 2 }));
    expect(res).toMatchObject({ ok: true, terbit: true, deskripsi: "Belajar KPK" });
    const urls = [`https://img.test/u1/c1/rilis-${RILIS}-1.jpg`, `https://img.test/u1/c1/rilis-${RILIS}-2.jpg`];
    expect(a.update).toHaveBeenCalledWith(expect.objectContaining({ status: "terbit", is_public: true, deskripsi_publik: "Belajar KPK", halaman_publik: urls }));
    expect((a.update.mock.calls[0][0] as { diterbitkan_at: string }).diterbitkan_at).toMatch(/^\d{4}-/);
    expect(bersihkanRilis).toHaveBeenCalledWith(a.c, "u1", "c1", new Set([`u1/c1/rilis-${RILIS}-1.jpg`, `u1/c1/rilis-${RILIS}-2.jpg`]));
  });
});

describe("bacaKomikPublik", () => {
  const baris = (halaman: unknown) => ({ id: "c1", judul: "Judul", jenjang: 5, deskripsi_publik: null, diterbitkan_at: "2026-10-01T00:00:00Z", user_id: "u1", halaman_publik: halaman });

  it("hanya mengembalikan URL halaman milik komik ini dan menolak komik tanpa salinan", async () => {
    const baik = klien({ komik: baris(["https://img.test/u1/c1/rilis-x-1.jpg", "https://img.test/u2/lain/rilis-x-1.jpg", "https://evil.test/a.jpg", 5]) });
    const hasil = await bacaKomikPublik(baik.c, "c1");
    expect(hasil?.halaman).toEqual(["https://img.test/u1/c1/rilis-x-1.jpg"]);
    expect(await bacaKomikPublik(klien({ komik: baris(null) }).c, "c1")).toBeNull();
    expect(await bacaKomikPublik(klien({ komik: baris([]) }).c, "c1")).toBeNull();
    expect(await bacaKomikPublik(klien({ komik: null }).c, "c1")).toBeNull();
  });
});

describe("laporkanKomik dan tarikKomik", () => {
  it("hanya komik terbit yang bisa dilaporkan, dan alasan harus valid", async () => {
    const tidakAda = klien({ komik: null });
    expect(await laporkanKomik(tidakAda.c, "u2", "c1", { alasan: "spam" })).toMatchObject({ ok: false, status: 404 });
    expect(tidakAda.upsert).not.toHaveBeenCalled();
    const ada = klien({ komik: { id: "c1" } });
    expect(await laporkanKomik(ada.c, "u2", "c1", { alasan: "iseng" })).toMatchObject({ ok: false, status: 400 });
    expect(await laporkanKomik(ada.c, "u2", "c1", { alasan: "hak-cipta", catatan: "dari buku" })).toMatchObject({ ok: true });
    expect(ada.upsert).toHaveBeenCalledWith(expect.objectContaining({ comic_id: "c1", pelapor_id: "u2", alasan: "hak-cipta", catatan: "dari buku" }), { onConflict: "comic_id,pelapor_id" });
  });

  it("menarik komik mengembalikan status draft, mengosongkan salinan, dan menghapus berkas salinan", async () => {
    vi.mocked(bersihkanRilis).mockClear();
    const a = klien({ updateData: [{ id: "c1", deskripsi_publik: "Halo" }] });
    expect(await tarikKomik(a.c, "u1", "c1")).toMatchObject({ ok: true, terbit: false, deskripsi: "Halo" });
    expect(a.update).toHaveBeenCalledWith({ is_public: false, status: "draft", halaman_publik: null });
    expect(bersihkanRilis).toHaveBeenCalledWith(a.c, "u1", "c1", new Set());
    vi.mocked(bersihkanRilis).mockClear();
    const kosong = klien({ updateData: [] });
    expect(await tarikKomik(kosong.c, "u2", "c1")).toMatchObject({ ok: false, status: 404 });
    expect(bersihkanRilis).not.toHaveBeenCalled();
  });
});
