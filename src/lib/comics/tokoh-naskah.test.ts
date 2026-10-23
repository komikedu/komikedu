import { describe, expect, it, vi } from "vitest";
import { tokohBelumAda } from "@/lib/ai/tokoh";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/characters", () => ({
  generateCharacterSheet: vi.fn(async (nama: string[]) => nama.map((n) => ({ nama: n, deskripsi: `deskripsi ${n}` }))),
}));

const { bersihkanNama, siapkanTokohNaskah, tokohNaskahBelumAda } = await import("./tokoh-naskah");

describe("tokohBelumAda", () => {
  const skrip = [
    { karakter: ["Raka", "Ibu"], dialog: [{ karakter: "Raka" }, { karakter: "Narator" }] },
    { karakter: ["Doni"], dialog: [{ karakter: "doni" }, { karakter: " Siti " }] },
  ];

  it("hanya tokoh yang belum terdaftar, tanpa narator dan tanpa dobel, urut kemunculan", () => {
    expect(tokohBelumAda(skrip, [{ nama: "raka" }, { nama: "Ibu" }])).toEqual(["Doni", "Siti"]);
    expect(tokohBelumAda(skrip, [])).toEqual(["Raka", "Ibu", "Doni", "Siti"]);
    expect(tokohBelumAda(skrip, [{ nama: "Raka" }, { nama: "Ibu" }, { nama: "Doni" }, { nama: "Siti" }])).toEqual([]);
    expect(tokohBelumAda([], [])).toEqual([]);
  });

  it("tokoh terdaftar tidak menutup tempat tokoh yang belum, batas hanya untuk hasil", () => {
    const banyak = [{ karakter: ["A", "B", "C", "D", "E", "F", "G", "H", "Baru1", "Baru2"] }];
    const ada = ["A", "B", "C", "D", "E", "F", "G", "H"].map((nama) => ({ nama }));
    expect(tokohBelumAda(banyak, ada, 8)).toEqual(["Baru1", "Baru2"]);
    expect(tokohBelumAda(banyak, [], 3)).toEqual(["A", "B", "C"]);
  });
});

describe("bersihkanNama", () => {
  it("merapikan, membuang kosong, kembar, terlalu panjang, dan bukan teks", () => {
    expect(bersihkanNama(["  Doni  ", "doni", "Bu   Rina", "", "x".repeat(41), 5, null])).toEqual(["Doni", "Bu Rina"]);
    expect(bersihkanNama("bukan larik")).toEqual([]);
    expect(bersihkanNama(undefined)).toEqual([]);
  });
});

/** Klien tiruan: select().eq()... mengembalikan baris tetap; update dan insert dicatat. */
function klien(baris: Record<string, unknown> | null) {
  const update = vi.fn();
  const insert = vi.fn(async () => ({ error: null }));
  const c = {
    from: () => {
      const q: Record<string, unknown> = {};
      for (const k of ["select", "eq"]) q[k] = () => q;
      q.maybeSingle = async () => ({ data: baris });
      q.update = (v: unknown) => (update(v), { eq: () => ({ eq: async () => ({ error: null }) }) });
      q.insert = insert;
      return q;
    },
  } as never;
  return { c, update, insert };
}

describe("siapkanTokohNaskah", () => {
  const joko = { id: "sendiri-1", nama: "Joko", peran: "", deskripsi: "anak laki-laki", preset: false };
  const komik = (tokoh: unknown[]) => ({ id: "c1", user_id: "u1", jenjang: 5, gaya: "kartun-cerah", cerita: null, tokoh_json: tokoh, karakter_json: null });

  it("menolak komik orang lain, daftar kosong atau semua sudah terdaftar, dan melebihi batas tokoh", async () => {
    const orang = klien(komik([joko]));
    expect(await siapkanTokohNaskah(orang.c, orang.c, "u2", "c1", ["Doni"])).toMatchObject({ ok: false, status: 404 });
    const k = klien(komik([joko]));
    expect(await siapkanTokohNaskah(k.c, k.c, "u1", "c1", [])).toMatchObject({ ok: false, status: 400 });
    expect(await siapkanTokohNaskah(k.c, k.c, "u1", "c1", ["joko"])).toMatchObject({ ok: false, status: 400 });
    const penuh = klien(komik(Array.from({ length: 7 }, (_, i) => ({ ...joko, id: `t${i}`, nama: `T${i}` }))));
    expect(await siapkanTokohNaskah(penuh.c, penuh.c, "u1", "c1", ["A", "B"])).toMatchObject({ ok: false, status: 400 });
    expect(k.update).not.toHaveBeenCalled();
    expect(penuh.update).not.toHaveBeenCalled();
  });

  it("menambah tokoh baru dengan deskripsi AI, memakai tokoh siap pakai bila namanya sama, dan menyelaraskan lembar karakter", async () => {
    const k = klien(komik([joko]));
    const res = await siapkanTokohNaskah(k.c, k.c, "u1", "c1", ["Doni", "Raka"]);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.tokoh.map((t) => t.nama)).toEqual(["Joko", "Doni", "Raka"]);
    expect(res.baru.map((t) => t.nama)).toEqual(["Doni", "Raka"]);
    expect(res.baru[0]).toMatchObject({ id: "doni", preset: true });
    expect(res.baru[1]).toMatchObject({ preset: false, deskripsi: "deskripsi Raka" });
    // lembar karakter memuat semua tokoh dengan deskripsi yang sama persis dengan daftar tokoh
    for (const t of res.tokoh) expect(res.karakter).toContainEqual({ nama: t.nama, deskripsi: t.deskripsi });
    expect(k.update).toHaveBeenCalledWith({ tokoh_json: res.tokoh, karakter_json: res.karakter });
    expect(k.insert).toHaveBeenCalled();
  });
});

describe("tokohNaskahBelumAda", () => {
  it("404 bila komik atau halaman tidak ditemukan", async () => {
    const kosong = klien(null);
    expect(await tokohNaskahBelumAda(kosong.c, "c1", "p1")).toMatchObject({ ok: false, status: 404 });
  });
});
