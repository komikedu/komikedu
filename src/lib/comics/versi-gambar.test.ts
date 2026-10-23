import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/storage/gambar", () => ({ hapusGambar: vi.fn() }));

const { catatVersi, pilihVersi, daftarVersi } = await import("./versi-gambar");
const { hapusGambar } = await import("@/lib/storage/gambar");

/** Klien Supabase tiruan yang mengingat baris tiap tabel dan menjawab query yang dipakai modul. */
function tiruan(awal: { panels?: { id: string; image_url: string | null }[]; panel_images?: { id: string; panel_id: string; image_url: string; created_at: string }[] }) {
  const db = { panels: awal.panels ?? [], panel_images: awal.panel_images ?? [] };
  let seq = 1000;
  const from = (tabel: "panels" | "panel_images") => {
    let rows = db[tabel] as Record<string, unknown>[];
    const q = {
      select: () => q,
      eq: (k: string, v: unknown) => ((rows = rows.filter((r) => r[k] === v)), q),
      in: (k: string, vs: unknown[]) => ((rows = rows.filter((r) => vs.includes(r[k]))), q),
      order: (_k: string, o: { ascending: boolean }) => (rows.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) * (o.ascending ? 1 : -1)), q),
      insert: async (row: Record<string, unknown>) => (db.panel_images.push({ id: `v${seq++}`, created_at: new Date(2026, 0, 1, 0, 0, seq).toISOString(), ...row } as never), { error: null }),
      delete: () => ({ in: async (_k: string, ids: string[]) => ((db.panel_images = db.panel_images.filter((r) => !ids.includes(r.id))), { error: null }) }),
      then: (res: (v: unknown) => unknown) => res({ data: rows, error: null, count: rows.length }),
      maybeSingle: async () => ({ data: rows[0] ?? null }),
    };
    return q;
  };
  return { db, client: { from } as never };
}

describe("riwayat versi gambar panel", () => {
  it("mencatat versi baru dan tidak membuang versi lama maupun berkasnya", async () => {
    const lama = Array.from({ length: 20 }, (_, i) => ({ id: `lama${i}`, panel_id: "p1", image_url: `https://x/${i}.webp`, created_at: new Date(2026, 0, 1, 0, 0, i).toISOString() }));
    const { db, client } = tiruan({ panels: [{ id: "p1", image_url: "https://x/baru.webp" }], panel_images: lama });
    await catatVersi(client, "p1", "https://x/baru.webp", "edit");
    expect(db.panel_images).toHaveLength(21);
    expect(db.panel_images.at(-1)).toMatchObject({ panel_id: "p1", image_url: "https://x/baru.webp", sumber: "edit" });
    expect(hapusGambar).not.toHaveBeenCalled();
  });

  it("mencatat versi tanpa latar dengan sumbernya", async () => {
    const { db, client } = tiruan({ panels: [{ id: "p1", image_url: "https://x/a.webp" }] });
    await catatVersi(client, "p1", "https://x/tanpa.webp", "tanpa-latar");
    expect(db.panel_images.at(-1)).toMatchObject({ sumber: "tanpa-latar" });
  });

  it("gagal mencatat tidak melempar galat", async () => {
    const rusak = { from: () => ({ insert: async () => ({ error: new Error("db mati") }) }) } as never;
    await expect(catatVersi(rusak, "p1", "https://x/a.webp", "halaman")).resolves.toBeUndefined();
  });

  it("daftar dan pilih versi menolak panel yang bukan milik komik ini", async () => {
    const kosong = { from: () => { const q: Record<string, unknown> = {}; for (const k of ["select", "eq", "order"]) q[k] = () => q; q.maybeSingle = async () => ({ data: null }); return q; } } as never;
    expect(await daftarVersi(kosong, "c1", "p1")).toMatchObject({ ok: false, status: 404 });
    expect(await pilihVersi(kosong, kosong, "c1", "p1", "v1")).toMatchObject({ ok: false, status: 404 });
  });
});
