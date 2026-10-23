import { beforeEach, describe, expect, it } from "vitest";
import { createKumpulan, createPage } from "./factory";
import { layoutKumpulan } from "./math-elements";
import { deletePanel, duplicatePanel, movePanel, splitPanel } from "./panel-ops";
import { EditorPayloadSchema, fromNested, toRows, type NestedPage } from "./persist";
import { clearHistory, selectSelectedElement, undo, useEditor } from "./store";

describe("layoutKumpulan", () => {
  it("jumlah ikon selalu tepat sesuai angka", () => {
    for (const jumlah of [1, 7, 9, 10, 23, 100]) {
      expect(layoutKumpulan({ w: 300, h: 120, jumlah, kolom: 5 })).toHaveLength(jumlah);
    }
  });

  it("10 benda 5 per baris menjadi 2 baris, semua di dalam kotak", () => {
    const pos = layoutKumpulan({ w: 300, h: 120, jumlah: 10, kolom: 5 });
    expect(new Set(pos.map((p) => p.y)).size).toBe(2);
    for (const p of pos) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.x + p.size).toBeLessThanOrEqual(300 + 1e-9);
      expect(p.y + p.size).toBeLessThanOrEqual(120 + 1e-9);
    }
  });

  it("kolom lebih banyak dari jumlah tidak membuat ikon terlalu kecil", () => {
    const pos = layoutKumpulan({ w: 300, h: 120, jumlah: 3, kolom: 10 });
    expect(new Set(pos.map((p) => p.y)).size).toBe(1);
    expect(pos[0].size).toBe(100); // 3 kolom efektif: 300/3
  });
});

describe("elemen ikut panelnya", () => {
  function halaman() {
    const page = createPage("2-kiri-kanan");
    const [a] = page.panels;
    page.elements = [createKumpulan(a.id, a.x + 100, a.y + 300), createKumpulan(a.id, a.x + a.w - 80, a.y + 700)];
    return page;
  }

  it("geser panel membawa elemennya", () => {
    const page = halaman();
    const e0 = { ...page.elements[0] };
    movePanel(page, page.panels[0].id, 20, 30);
    expect(page.elements[0].x - e0.x).toBe(20);
    expect(page.elements[0].y - e0.y).toBe(30);
  });

  it("split memindahkan elemen ke panel tempat titik tengahnya berada", () => {
    const page = halaman();
    const asal = page.panels[0].id;
    splitPanel(page, asal, "vertikal");
    const baru = page.panels[1].id;
    expect(page.elements.map((e) => e.panelId)).toEqual([asal, baru]);
  });

  it("duplikat menyalin elemen dengan id baru; hapus panel menghapus elemennya", () => {
    const page = halaman();
    const salinan = duplicatePanel(page, page.panels[0].id)!;
    expect(page.elements.filter((e) => e.panelId === salinan)).toHaveLength(2);
    expect(new Set(page.elements.map((e) => e.id)).size).toBe(4);
    const dihapus = page.panels[0].id;
    deletePanel(page, dihapus);
    expect(page.elements.some((e) => e.panelId === dihapus)).toBe(false);
    expect(page.elements.every((e) => page.panels.some((p) => p.id === e.panelId))).toBe(true);
    expect(page.elements).toHaveLength(2);
  });

  it("tersimpan per panel dan dimuat ulang utuh", () => {
    const page = halaman();
    const el0 = page.elements[0];
    if (el0.kind !== "kumpulan") throw new Error("kumpulan");
    el0.jumlah = 12;
    el0.ikon = "jeruk";
    const parsed = EditorPayloadSchema.safeParse(JSON.parse(JSON.stringify([page])));
    expect(parsed.success).toBe(true);
    const rows = toRows("c1", parsed.success ? parsed.data : []);
    expect(rows.panels[0].math_elements_json).toHaveLength(2);
    expect(rows.panels[1].math_elements_json).toEqual([]);
    const nested: NestedPage[] = [
      {
        id: page.id,
        urutan: 1,
        template_layout: page.layoutId,
        panels: rows.panels.map((r) => ({ ...r, script_json: null, image_url: null, bubbles: [] })),
      },
    ];
    const [back] = fromNested(nested);
    expect(back.elements).toEqual(page.elements);
  });

  it("validasi menolak jumlah di luar batas dan elemen yang menunjuk panel halaman lain", () => {
    const page = halaman();
    const data = JSON.parse(JSON.stringify([page]));
    data[0].elements[0].jumlah = 0;
    expect(EditorPayloadSchema.safeParse(data).success).toBe(false);
    const dua = [halaman(), createPage("1-penuh")];
    dua[0].elements[0].panelId = dua[1].panels[0].id;
    expect(EditorPayloadSchema.safeParse(JSON.parse(JSON.stringify(dua))).success).toBe(false);
  });
});

describe("store elemen", () => {
  const st = () => useEditor.getState();
  const page = () => st().pages.find((p) => p.id === st().activePageId)!;

  beforeEach(() => {
    st().init([createPage("1-penuh")]);
    clearHistory();
  });

  it("alat Elemen Mat menaruh kumpulan 10 apel, terpilih, lalu kembali ke alat Pilih", () => {
    st().setTool("mat");
    const p = page().panels[0];
    st().addKumpulan(p.id, p.x + 200, p.y + 200);
    const el = selectSelectedElement(st())!;
    expect(el).toMatchObject({ ikon: "apel", jumlah: 10, kolom: 5, panelId: p.id });
    expect(st().tool).toBe("move");
  });

  it("ubah jumlah lalu undo", () => {
    const p = page().panels[0];
    st().addKumpulan(p.id, 300, 300);
    const id = page().elements[0].id;
    st().updateElement(id, { jumlah: 9 });
    st().updateElement(id, { jumlah: 10 });
    undo();
    expect(page().elements[0]).toMatchObject({ jumlah: 9 });
  });
});
