import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { catatGaleriTokoh, pasangGambarTokoh } = await import("./galeri-tokoh");

const joko = { id: "sendiri-1", nama: "Joko", peran: "", deskripsi: "anak laki-laki", preset: false, potret: "https://x/baru.webp" };
const doni = { id: "doni", nama: "Doni", peran: "Siswa", deskripsi: "siswa", preset: true };

/** Klien pengguna tiruan: baris galeri yang terbaca lewat RLS (null = bukan milik komik ini). */
const pengguna = (baris: { id: string; jenis: string; image_url: string } | null) =>
  ({ from: () => { const q: Record<string, unknown> = {}; for (const k of ["select", "eq"]) q[k] = () => q; q.maybeSingle = async () => ({ data: baris }); return q; } }) as never;

/** Klien admin tiruan: membaca tokoh_json dan mencatat pembaruan. */
function admin(tokoh: unknown[]) {
  const update = vi.fn();
  const c = {
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { tokoh_json: tokoh } }) }) }),
      update: (v: unknown) => ({ eq: async () => (update(v), { error: null }) }),
      insert: async () => ({ error: null }),
    }),
  } as never;
  return { c, update };
}

describe("galeri gambar tokoh", () => {
  it("memasang gambar lama dari galeri sebagai potret aktif", async () => {
    const { c, update } = admin([joko, doni]);
    const res = await pasangGambarTokoh(pengguna({ id: "g1", jenis: "potret", image_url: "https://x/lama.webp" }), c, "c1", "sendiri-1", "g1");
    expect(res).toMatchObject({ ok: true });
    expect(update).toHaveBeenCalledWith({ tokoh_json: [{ ...joko, potret: "https://x/lama.webp" }, doni] });
  });

  it("badan penuh dipasang ke kolom badan tanpa mengubah potret", async () => {
    const { c, update } = admin([joko]);
    await pasangGambarTokoh(pengguna({ id: "g2", jenis: "badan", image_url: "https://x/badan.webp" }), c, "c1", "sendiri-1", "g2");
    expect(update).toHaveBeenCalledWith({ tokoh_json: [{ ...joko, badan: "https://x/badan.webp" }] });
  });

  it("menolak gambar yang bukan di galeri komik ini, tokoh yang sudah dihapus, dan potret tokoh siap pakai", async () => {
    const { c, update } = admin([joko]);
    expect(await pasangGambarTokoh(pengguna(null), c, "c1", "sendiri-1", "g1")).toMatchObject({ ok: false, status: 404 });
    expect(await pasangGambarTokoh(pengguna({ id: "g1", jenis: "potret", image_url: "https://x/a.webp" }), c, "c1", "hilang", "g1")).toMatchObject({ ok: false, status: 404 });
    const preset = admin([doni]);
    expect(await pasangGambarTokoh(pengguna({ id: "g1", jenis: "potret", image_url: "https://x/a.webp" }), preset.c, "c1", "doni", "g1")).toMatchObject({ ok: false, status: 400 });
    expect(update).not.toHaveBeenCalled();
    expect(preset.update).not.toHaveBeenCalled();
  });

  it("gagal mencatat ke galeri tidak melempar galat", async () => {
    const rusak = { from: () => ({ insert: async () => ({ error: new Error("db mati") }) }) } as never;
    await expect(catatGaleriTokoh(rusak, "c1", "sendiri-1", "potret", "https://x/a.webp", "ai")).resolves.toBeUndefined();
  });
});
