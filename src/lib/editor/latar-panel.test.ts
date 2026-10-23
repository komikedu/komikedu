import { describe, expect, it } from "vitest";
import { aturanUkuran, cssLatar, gantiJenisLatar, irisanSinar, jajaranGaris, MAKS_TITIK, PRESET_LATAR, titikGradasi, titikHalftone } from "./latar-panel";
import { fromNested, EditorPayloadSchema, toRows, type NestedPage } from "./persist";
import { setLatar } from "./panel-ops";
import type { EditorPage, Latar } from "./types";

const L: Latar = { jenis: "halftone", warna1: "#ffffff", warna2: "#000000", ukuran: 20, sudut: 45 };
const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("titikHalftone", () => {
  it("memenuhi panel dan titik menyentuh panel", () => {
    const t = titikHalftone(300, 200, 20, 45, false);
    expect(t.length).toBeGreaterThan(100);
    expect(t.every((p) => p.x + p.r >= 0 && p.x - p.r <= 300 && p.y + p.r >= 0 && p.y - p.r <= 200)).toBe(true);
  });
  it("memudar: ukuran titik berubah sepanjang arah", () => {
    const t = titikHalftone(300, 200, 20, 0, true);
    const kiri = t.filter((p) => p.x < 60).map((p) => p.r);
    const kanan = t.filter((p) => p.x > 240).map((p) => p.r);
    expect(Math.max(...kiri)).toBeLessThan(Math.min(...kanan));
  });
  it("dibatasi jumlahnya", () => {
    expect(titikHalftone(5000, 5000, 4, 45, false).length).toBeLessThanOrEqual(MAKS_TITIK);
  });
});

describe("sinar, garis, gradasi", () => {
  it("irisan sinar sebanyak jumlah dan separuh lebar", () => {
    const s = irisanSinar(8, 0);
    expect(s).toHaveLength(8);
    expect(s[0].ke - s[0].dari).toBeCloseTo(Math.PI / 8);
  });
  it("garis berselang-seling dan berupa 4 titik", () => {
    const g = jajaranGaris(300, 200, 30, 45);
    expect(g.length).toBeGreaterThan(3);
    expect(g.every((p) => p.length === 4)).toBe(true);
  });
  it("gradasi melintasi seluruh panel", () => {
    const { mulai, akhir } = titikGradasi(100, 50, 0);
    expect(mulai).toEqual({ x: 0, y: 25 });
    expect(akhir).toEqual({ x: 100, y: 25 });
  });
});

describe("preset dan css", () => {
  it("semua preset valid dan punya css", () => {
    for (const p of PRESET_LATAR) {
      expect(p.latar.warna1).toMatch(/^#[0-9a-f]{6}$/i);
      expect(cssLatar(p.latar, 400, 300).backgroundColor).toBe(p.latar.warna1);
    }
  });
  it("ganti jenis memakai ukuran bawaan jenis itu", () => {
    expect(gantiJenisLatar(L, "sinar").ukuran).toBe(aturanUkuran("sinar")!.bawaan);
    expect(gantiJenisLatar(L, "polos").ukuran).toBe(0);
    expect(gantiJenisLatar(L, "garis").warna1).toBe("#ffffff");
  });
});

describe("simpan dan muat", () => {
  const halaman = (latar?: Latar | null): EditorPage => ({
    id: ID(1),
    layoutId: "1-penuh",
    panels: [{ id: ID(2), x: 0, y: 0, w: 900, h: 1200, imageUrl: null, visible: true, adegan: "", latar }],
    bubbles: [],
    elements: [],
  } as unknown as EditorPage);

  it("setLatar mengubah dan menghapus", () => {
    const h = halaman();
    expect(setLatar(h, ID(2), L)).toBe(true);
    expect(h.panels[0].latar).toEqual(L);
    setLatar(h, ID(2), null);
    expect(h.panels[0].latar).toBeNull();
    expect(setLatar(h, ID(9), L)).toBe(false);
  });
  it("lolos zod dan bolak-balik lewat baris", () => {
    const h = halaman(L);
    expect(EditorPayloadSchema.safeParse([{ ...h, layoutId: h.layoutId }]).success).toBe(true);
    const baris = toRows("c", [h]);
    expect(baris.panels[0].posisi.latar).toEqual(L);
    const nested: NestedPage[] = [{ id: ID(1), urutan: 1, template_layout: h.layoutId, panels: [{ id: ID(2), urutan: 1, script_json: null, image_url: null, posisi: baris.panels[0].posisi, tampil: true, adegan: "", bubbles: [] }] }];
    expect(fromNested(nested)[0].panels[0].latar).toEqual(L);
  });
  it("menolak warna aneh dan membuang data rusak saat memuat", () => {
    const h = halaman({ ...L, warna1: "red" });
    expect(EditorPayloadSchema.safeParse([h]).success).toBe(false);
    const nested: NestedPage[] = [{ id: ID(1), urutan: 1, template_layout: "x", panels: [{ id: ID(2), urutan: 1, script_json: null, image_url: null, posisi: { x: 0, y: 0, w: 10, h: 10, latar: { jenis: "x" } }, tampil: true, adegan: "", bubbles: [] }] }];
    expect(fromNested(nested)[0].panels[0].latar).toBeUndefined();
  });
});
