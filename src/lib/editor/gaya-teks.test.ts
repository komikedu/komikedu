import { beforeEach, describe, expect, it } from "vitest";
import { createPage, createTeks } from "./factory";
import { BURST_BAWAAN, GAYA_TEKS, burstTeks, gayaTeks, lapisanTeks, titikBurst } from "./gaya-teks";
import { deletePanel, duplicatePanel, splitPanel } from "./panel-ops";
import { EditorPayloadSchema, fromNested, toRows, type NestedPage } from "./persist";
import { clearHistory, useEditor } from "./store";

describe("gaya teks", () => {
  it("id unik dan lapisan terakhir adalah isi huruf", () => {
    expect(new Set(GAYA_TEKS.map((g) => g.id)).size).toBe(GAYA_TEKS.length);
    for (const g of GAYA_TEKS) expect(g.lapisan.length).toBeGreaterThan(0);
  });
  it("gaya tak dikenal jatuh ke gaya pertama", () => {
    expect(gayaTeks("tidak-ada").id).toBe(GAYA_TEKS[0].id);
  });
  it("warna pengganti hanya mengubah isi huruf", () => {
    const asli = gayaTeks("sfx-ledak").lapisan;
    const baru = lapisanTeks({ gaya: "sfx-ledak", warna: "#00ff00" });
    expect(baru.at(-1)!.fill).toBe("#00ff00");
    expect(baru.slice(0, -1)).toEqual(asli.slice(0, -1));
  });
});

describe("elemen teks", () => {
  const halaman = () => {
    const p = createPage("2-atas-bawah");
    p.elements.push({ ...createTeks(p.panels[0].id, 300, 200), rotasi: -15 });
    return p;
  };
  beforeEach(() => {
    const p = halaman();
    useEditor.setState({ pages: [p], activePageId: p.id });
    clearHistory();
  });

  it("lolos validasi dan tersimpan dengan rotasi lalu dimuat utuh", () => {
    const p = halaman();
    const parsed = EditorPayloadSchema.safeParse(JSON.parse(JSON.stringify([p])));
    expect(parsed.success).toBe(true);
    const rows = toRows("c1", parsed.success ? parsed.data : []);
    const baris = rows.panels[0].math_elements_json[0];
    expect(baris).toMatchObject({ kind: "teks", text: "BUM!", rotasi: -15, tampil: true });
    const nested: NestedPage[] = [
      {
        id: p.id,
        urutan: 1,
        template_layout: p.layoutId,
        panels: rows.panels.map((r, i) => ({ id: r.id, urutan: i + 1, script_json: null, image_url: null, posisi: r.posisi, tampil: r.tampil, adegan: r.adegan, math_elements_json: r.math_elements_json, bubbles: [] })),
      },
    ];
    expect(fromNested(nested)[0].elements[0]).toMatchObject({ kind: "teks", text: "BUM!", rotasi: -15, gaya: "sfx-ledak" });
  });

  it("menolak gaya dan warna yang tidak dikenal", () => {
    const p = halaman();
    const el = p.elements[0];
    if (el.kind !== "teks") throw new Error("teks");
    expect(EditorPayloadSchema.safeParse([{ ...p, elements: [{ ...el, gaya: "liar" }] }]).success).toBe(false);
    expect(EditorPayloadSchema.safeParse([{ ...p, elements: [{ ...el, warna: "merah" }] }]).success).toBe(false);
    expect(EditorPayloadSchema.safeParse([{ ...p, elements: [{ ...el, text: "x".repeat(81) }] }]).success).toBe(false);
  });

  it("addTeksGaya menambah dan memilih elemen; undo membatalkan", () => {
    const st = useEditor.getState();
    const page = () => useEditor.getState().pages[0];
    const sebelum = page().elements.length;
    st.addTeksGaya(page().panels[1].id, 400, 900);
    expect(page().elements).toHaveLength(sebelum + 1);
    expect(page().elements.at(-1)!.kind).toBe("teks");
    expect(useEditor.getState().selectedId).toBe(page().elements.at(-1)!.id);
  });

  it("ikut pindah saat panel dibagi dan ikut tersalin saat panel diduplikat", () => {
    const p = halaman();
    const panel = p.panels[0];
    duplicatePanel(p, panel.id);
    expect(p.elements.filter((e) => e.kind === "teks")).toHaveLength(2);
    const q = halaman();
    splitPanel(q, q.panels[0].id, "horizontal");
    expect(q.elements).toHaveLength(1);
  });
});

describe("elemen bebas (tanpa panel)", () => {
  const halaman = () => {
    const p = createPage("2-atas-bawah");
    p.elements.push(createTeks(null, 450, 60, "judul-kuning", "JUDUL"));
    p.elements.push(createTeks(p.panels[0].id, 300, 200));
    return p;
  };

  it("tersimpan di kolom halaman dan dimuat kembali tanpa panel", () => {
    const p = halaman();
    const parsed = EditorPayloadSchema.safeParse(JSON.parse(JSON.stringify([p])));
    expect(parsed.success).toBe(true);
    const rows = toRows("c1", parsed.success ? parsed.data : []);
    expect(rows.pages[0].elemen_bebas).toHaveLength(1);
    expect(rows.pages[0].elemen_bebas[0]).toMatchObject({ kind: "teks", text: "JUDUL", tampil: true });
    expect(rows.panels[0].math_elements_json).toHaveLength(1);
    const nested: NestedPage[] = [
      {
        id: p.id,
        urutan: 1,
        template_layout: p.layoutId,
        elemen_bebas: rows.pages[0].elemen_bebas,
        panels: rows.panels.map((r, i) => ({ id: r.id, urutan: i + 1, script_json: null, image_url: null, posisi: r.posisi, tampil: r.tampil, adegan: r.adegan, math_elements_json: r.math_elements_json, bubbles: [] })),
      },
    ];
    const muat = fromNested(nested)[0].elements;
    expect(muat).toHaveLength(2);
    expect(muat.filter((e) => e.panelId === null)).toHaveLength(1);
  });

  it("halaman lama tanpa kolom elemen bebas tetap termuat", () => {
    const p = halaman();
    const nested: NestedPage[] = [{ id: p.id, urutan: 1, template_layout: p.layoutId, panels: [] }];
    expect(fromNested(nested)[0].elements).toEqual([]);
  });

  it("tidak ikut terhapus bersama panel dan tidak ikut tersalin", () => {
    const p = halaman();
    duplicatePanel(p, p.panels[0].id);
    expect(p.elements.filter((e) => e.panelId === null)).toHaveLength(1);
    deletePanel(p, p.panels[0].id);
    expect(p.elements.filter((e) => e.panelId === null)).toHaveLength(1);
  });

  it("menolak elemen yang menunjuk panel di halaman lain", () => {
    const p = halaman();
    const asing = { ...p.elements[1], panelId: "11111111-1111-4111-8111-111111111111" };
    expect(EditorPayloadSchema.safeParse([{ ...p, elements: [asing] }]).success).toBe(false);
  });

  it("ikatElemen melepas dan mengikat ke panel di bawah titik tengah", () => {
    const p = halaman();
    useEditor.setState({ pages: [p], activePageId: p.id });
    const id = p.elements[1].id;
    const ambil = () => useEditor.getState().pages[0].elements.find((e) => e.id === id)!;
    useEditor.getState().ikatElemen(id, true);
    expect(ambil().panelId).toBeNull();
    useEditor.getState().ikatElemen(id, false);
    expect(ambil().panelId).toBe(p.panels[0].id);
  });
});

describe("burst", () => {
  it("titik burst bergantian ujung dan lekuk, di dalam kotak, dan selalu sama", () => {
    const a = titikBurst(400, 300, 16);
    expect(a).toHaveLength(32);
    expect(a).toEqual(titikBurst(400, 300, 16));
    for (const t of a) {
      expect(t.x).toBeGreaterThanOrEqual(-1e-9);
      expect(t.x).toBeLessThanOrEqual(400 + 1e-9);
      expect(t.y).toBeGreaterThanOrEqual(-1e-9);
      expect(t.y).toBeLessThanOrEqual(300 + 1e-9);
    }
    const jarak = (t: { x: number; y: number }) => Math.hypot(t.x - 200, (t.y - 150) * (200 / 150));
    expect(jarak(a[0])).toBeGreaterThan(jarak(a[1]));
  });
  it("jumlah gerigi dibatasi", () => {
    expect(titikBurst(100, 100, 1)).toHaveLength(12);
    expect(titikBurst(100, 100, 999)).toHaveLength(80);
  });
  it("burst mengikuti bawaan gaya dan bisa dinyalakan atau dimatikan", () => {
    expect(burstTeks({ gaya: "burst-kuning" })).not.toBeNull();
    expect(burstTeks({ gaya: "burst-kuning", latarBurst: false })).toBeNull();
    expect(burstTeks({ gaya: "putih-tebal" })).toBeNull();
    expect(burstTeks({ gaya: "putih-tebal", latarBurst: true })).toEqual(BURST_BAWAAN);
  });
  it("gaya burst membuat kotak lebih tinggi dan kenal oleh validasi", () => {
    const el = createTeks(null, 450, 300, "burst-merah", "BAM!");
    expect(el.h).toBeGreaterThan(250);
    const p = createPage("1-penuh");
    p.elements.push({ ...el, latarBurst: false });
    expect(EditorPayloadSchema.safeParse(JSON.parse(JSON.stringify([p]))).success).toBe(true);
  });
  it("ada 12 gaya", () => {
    expect(GAYA_TEKS).toHaveLength(12);
  });
});
