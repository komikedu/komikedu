import { describe, expect, it } from "vitest";
import { KOLOM_COMICS, envHilang, jenisKunci, masalahKonfigurasi, periksaDatabase } from "./diagnosa";

const jwt = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.tanda-tangan`;
const URL_OK = "https://abcdefgh.supabase.co";
const env = (o: Record<string, string | undefined> = {}) => ({
  NEXT_PUBLIC_SUPABASE_URL: URL_OK,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt("anon"),
  SUPABASE_SERVICE_ROLE_KEY: jwt("service_role"),
  ...o,
});

describe("jenisKunci", () => {
  it("membaca klaim role dari JWT dan awalan kunci format baru, tanpa membuka isinya", () => {
    expect(jenisKunci(jwt("anon"))).toBe("anon");
    expect(jenisKunci(jwt("service_role"))).toBe("service_role");
    expect(jenisKunci(jwt("authenticated"))).toBe("jwt-lain");
    expect(jenisKunci("sb_publishable_abc")).toBe("publishable");
    expect(jenisKunci("sb_secret_abc")).toBe("secret");
  });
  it("kosong, spasi, dan sembarang teks", () => {
    expect(jenisKunci(undefined)).toBe("kosong");
    expect(jenisKunci("   ")).toBe("kosong");
    expect(jenisKunci("bukan-kunci")).toBe("tidak-dikenal");
    expect(jenisKunci("a.b.c")).toBe("tidak-dikenal");
  });
});

describe("envHilang", () => {
  it("menganggap variabel kosong atau hanya spasi sebagai hilang", () => {
    expect(envHilang({ NEXT_PUBLIC_SUPABASE_URL: URL_OK, SUPABASE_SERVICE_ROLE_KEY: "  " })).toEqual(["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]);
    expect(envHilang(env())).toEqual([]);
  });
});

describe("masalahKonfigurasi", () => {
  it("konfigurasi benar tidak menghasilkan masalah (kunci format baru juga sah)", () => {
    expect(masalahKonfigurasi(env())).toEqual([]);
    expect(masalahKonfigurasi(env({ NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_x", SUPABASE_SERVICE_ROLE_KEY: "sb_secret_y" }))).toEqual([]);
  });
  it("service role hilang atau kosong disebut dengan nama variabelnya", () => {
    expect(masalahKonfigurasi(env({ SUPABASE_SERVICE_ROLE_KEY: undefined }))).toEqual(["SUPABASE_SERVICE_ROLE_KEY belum diisi atau kosong"]);
    expect(masalahKonfigurasi(env({ SUPABASE_SERVICE_ROLE_KEY: "" }))).toHaveLength(1);
  });
  it("service role berisi kunci anon (salah tempel)", () => {
    const m = masalahKonfigurasi(env({ SUPABASE_SERVICE_ROLE_KEY: jwt("anon") }));
    expect(m.join(" ")).toMatch(/SUPABASE_SERVICE_ROLE_KEY berisi kunci publik/);
    expect(m.join(" ")).toMatch(/nilai yang sama|berisi kunci publik/);
  });
  it("kunci rahasia di variabel NEXT_PUBLIC terdeteksi sebagai kebocoran", () => {
    expect(masalahKonfigurasi(env({ NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt("service_role") })).join(" ")).toMatch(/RAHASIA/);
  });
  it("alamat Supabase yang salah bentuk", () => {
    expect(masalahKonfigurasi(env({ NEXT_PUBLIC_SUPABASE_URL: "https://abcdefgh.supabase.co/rest/v1" })).join(" ")).toMatch(/bukan alamat project/);
    expect(masalahKonfigurasi(env({ NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321" })).join(" ")).toMatch(/bukan alamat project/);
  });
  it("tidak pernah memuat isi kunci pada pesannya", () => {
    const rahasia = jwt("service_role");
    const semua = masalahKonfigurasi(env({ NEXT_PUBLIC_SUPABASE_ANON_KEY: rahasia, SUPABASE_SERVICE_ROLE_KEY: rahasia })).join(" ");
    expect(semua).not.toContain(rahasia);
  });
});

describe("periksaDatabase", () => {
  const klien = (galat: (kolom: string) => string | null) =>
    ({
      from: () => ({ select: (k: string) => Promise.resolve({ error: galat(k) ? { message: galat(k)! } : null }) }),
    }) as never;

  it("koneksi gagal menghentikan pemeriksaan kolom dan membawa pesannya", async () => {
    const h = await periksaDatabase(klien(() => "Invalid API key"));
    expect(h).toEqual([{ nama: "Koneksi database (service role)", ok: false, detail: "Invalid API key" }]);
  });
  it("menyebut semua kolom yang hilang, bukan hanya yang pertama", async () => {
    const h = await periksaDatabase(klien((k) => (k === "tema" || k === "lebar_halaman" ? `column comics.${k} does not exist` : null)));
    const kolom = h.find((x) => x.nama === "Kolom tabel comics")!;
    expect(h[0].ok).toBe(true);
    expect(kolom).toMatchObject({ ok: false });
    expect(kolom.detail).toContain("lebar_halaman");
    expect(kolom.detail).toContain("tema");
    expect(kolom.detail).not.toContain("judul");
  });
  it("semua lengkap", async () => {
    const h = await periksaDatabase(klien(() => null));
    expect(h.every((x) => x.ok)).toBe(true);
    expect(h.find((x) => x.nama === "Kolom tabel comics")!.detail).toContain(String(KOLOM_COMICS.length));
  });
  it("melaporkan waktu satu permintaan dan menandai yang lambat", async () => {
    const lambat = {
      from: () => ({ select: () => new Promise((ok) => setTimeout(() => ok({ error: null }), 420)) }),
    } as never;
    const h = await periksaDatabase(lambat);
    const waktu = h.find((x) => x.nama === "Waktu satu permintaan ke database")!;
    expect(waktu.ok).toBe(false);
    expect(waktu.detail).toMatch(/lambat/);
    const cepat = await periksaDatabase(klien(() => null));
    expect(cepat.find((x) => x.nama === "Waktu satu permintaan ke database")).toMatchObject({ ok: true });
  }, 15000);
});
