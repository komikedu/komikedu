import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const SB = "https://abc.supabase.co";
const R2_ENV = {
  R2_ACCOUNT_ID: "acc",
  R2_ACCESS_KEY_ID: "k",
  R2_SECRET_ACCESS_KEY: "s",
  R2_BUCKET: "komikedu",
  R2_PUBLIC_URL: "https://img.komikedu.id/",
};

async function muat(env: Record<string, string | undefined>) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SB);
  for (const k of Object.keys(R2_ENV)) vi.stubEnv(k, env[k] ?? "");
  return import("./gambar");
}

afterEach(() => vi.unstubAllEnvs());

describe("penyimpanan gambar", () => {
  describe("tanpa R2 (Supabase)", () => {
    it("memakai Supabase dan mengenali URL-nya", async () => {
      const g = await muat({});
      expect(g.penyimpananAktif()).toBe("supabase");
      expect(g.kunciDariUrl(`${SB}/storage/v1/object/public/panels/u1/c1/a.webp`)).toBe("u1/c1/a.webp");
      expect(g.kunciDariUrl("https://img.komikedu.id/u1/c1/a.webp")).toBeNull();
    });
  });

  describe("dengan R2", () => {
    let g: Awaited<ReturnType<typeof muat>>;
    beforeEach(async () => {
      g = await muat(R2_ENV);
    });

    it("aktif dan mengenali URL R2 maupun gambar lama di Supabase", () => {
      expect(g.penyimpananAktif()).toBe("r2");
      expect(g.kunciDariUrl("https://img.komikedu.id/u1/c1/tokoh-a%20b.webp?x=1")).toBe("u1/c1/tokoh-a b.webp");
      expect(g.kunciDariUrl(`${SB}/storage/v1/object/public/panels/u1/c1/lama.webp`)).toBe("u1/c1/lama.webp");
    });

    it("menolak URL asing dan jalur keluar folder", () => {
      expect(g.kunciDariUrl("https://evil.test/u1/c1/a.webp")).toBeNull();
      expect(g.kunciDariUrl("https://img.komikedu.id/u1/%2E%2E/u2/a.webp")).toBeNull();
    });

    it("kunciKomik hanya menerima berkas di folder komik milik pengguna itu", () => {
      expect(g.kunciKomik("https://img.komikedu.id/u1/c1/a.webp", "u1", "c1")).toBe("u1/c1/a.webp");
      expect(g.kunciKomik("https://img.komikedu.id/u2/c1/a.webp", "u1", "c1")).toBeNull();
      expect(g.kunciKomik("https://img.komikedu.id/u1/c2/a.webp", "u1", "c1")).toBeNull();
      expect(g.kunciKomik(null, "u1", "c1")).toBeNull();
    });
  });
});
