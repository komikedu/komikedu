import { describe, expect, it } from "vitest";
import { BENTUK_BALON, areaTeks, garisGerak, lingkaranAwan, titikGerigi, ukuranBentuk } from "./bentuk-balon";
import { createBubble, createPage } from "./factory";
import { EditorPayloadSchema, fromNested, toRows, type NestedPage } from "./persist";

describe("geometri bentuk balon", () => {
  it("bintang bergerigi: bergantian ujung dan lekuk, di dalam kotak", () => {
    const p = titikGerigi(300, 200, 13, 0.62);
    expect(p).toHaveLength(26);
    for (const t of p) {
      expect(t.x).toBeGreaterThanOrEqual(-1e-9);
      expect(t.x).toBeLessThanOrEqual(300 + 1e-9);
      expect(t.y).toBeGreaterThanOrEqual(-1e-9);
      expect(t.y).toBeLessThanOrEqual(200 + 1e-9);
    }
    const jarak = (t: { x: number; y: number }) => Math.hypot((t.x - 150) / 150, (t.y - 100) / 100);
    expect(jarak(p[0])).toBeGreaterThan(jarak(p[1]));
  });
  it("teriakan lebih runcing dari ledakan", () => {
    const j = (t: { x: number; y: number }) => Math.hypot((t.x - 150) / 150, (t.y - 100) / 100);
    expect(titikGerigi(300, 200, 22, 0.8).filter((_, i) => i % 2).every((t) => j(t) > 0.7)).toBe(true);
    expect(titikGerigi(300, 200, 13, 0.62).filter((_, i) => i % 2).every((t) => j(t) < 0.75)).toBe(true);
  });
  it("awan: lingkaran mengelilingi tepi dan tidak keluar jauh dari kotak", () => {
    const { lingkaran } = lingkaranAwan(280, 170);
    expect(lingkaran.length).toBeGreaterThanOrEqual(8);
    for (const l of lingkaran) {
      expect(l.x - l.r).toBeGreaterThanOrEqual(-1);
      expect(l.x + l.r).toBeLessThanOrEqual(281);
      expect(l.y - l.r).toBeGreaterThanOrEqual(-1);
      expect(l.y + l.r).toBeLessThanOrEqual(171);
    }
  });
  it("garis gerak ada enam, dua kelompok", () => {
    expect(garisGerak(260, 130)).toHaveLength(6);
  });
  it("area teks di dalam balon dan ukuran bergerigi diperbesar", () => {
    for (const b of BENTUK_BALON) {
      const a = areaTeks(b.id, 300, 200);
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x + a.w).toBeLessThanOrEqual(300);
      expect(a.y + a.h).toBeLessThanOrEqual(200);
    }
    expect(ukuranBentuk("ledakan", 260, 130)).toEqual({ w: 300, h: 220 });
    expect(ukuranBentuk("oval", 260, 130)).toEqual({ w: 260, h: 130 });
  });
});

describe("bentuk balon tersimpan", () => {
  const halaman = () => {
    const p = createPage("1-penuh");
    p.bubbles.push({ ...createBubble(p.panels[0].id, "bicara", 300, 300), bentuk: "ledakan" });
    return p;
  };
  it("lolos validasi, tersimpan di kolom ukuran, dan dimuat utuh", () => {
    const p = halaman();
    const parsed = EditorPayloadSchema.safeParse(JSON.parse(JSON.stringify([p])));
    expect(parsed.success).toBe(true);
    const rows = toRows("c", parsed.success ? parsed.data : []);
    expect(rows.bubbles[0].ukuran.bentuk).toBe("ledakan");
    const nested: NestedPage[] = [
      {
        id: p.id,
        urutan: 1,
        template_layout: p.layoutId,
        panels: [{ id: rows.panels[0].id, urutan: 1, script_json: null, image_url: null, posisi: rows.panels[0].posisi, tampil: true, adegan: "", math_elements_json: [], bubbles: rows.bubbles.map((b) => ({ id: b.id, jenis: b.jenis, teks: b.teks, posisi: b.posisi, ukuran: b.ukuran, ekor: b.ekor, font_size: b.font_size, tampil: b.tampil, urutan: b.urutan })) }],
      },
    ];
    expect(fromNested(nested)[0].bubbles[0].bentuk).toBe("ledakan");
  });
  it("balon lama tanpa bentuk tetap termuat dan bentuk rusak dibuang", () => {
    const nested = (ukuran: { w: number; h: number; bentuk?: string }): NestedPage[] => [
      { id: "a", urutan: 1, template_layout: null, panels: [{ id: "p", urutan: 1, script_json: null, image_url: null, posisi: null, tampil: true, adegan: "", bubbles: [{ id: "b", jenis: "bicara", teks: "x", posisi: { x: 0, y: 0 }, ukuran, ekor: null, font_size: 20, tampil: true, urutan: 0 }] }] },
    ];
    expect(fromNested(nested({ w: 100, h: 50 }))[0].bubbles[0].bentuk).toBeUndefined();
    expect(fromNested(nested({ w: 100, h: 50, bentuk: "liar" }))[0].bubbles[0].bentuk).toBeUndefined();
  });
  it("menolak bentuk tak dikenal saat disimpan", () => {
    const p = halaman();
    expect(EditorPayloadSchema.safeParse([{ ...p, bubbles: [{ ...p.bubbles[0], bentuk: "liar" }] }]).success).toBe(false);
  });
});
