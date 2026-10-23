import { describe, expect, it } from "vitest";
import { createBubble, createPage } from "./factory";
import { EditorPayloadSchema, fromNested, toRows, type NestedPage } from "./persist";
import type { EditorPage } from "./types";

function samplePage(): EditorPage {
  const page = createPage("3-satu-atas-dua-bawah", ["a", "b", "c"]);
  page.bubbles = [
    createBubble(page.panels[0].id, "bicara", 200, 100, "Satu"),
    createBubble(page.panels[2].id, "narasi", 600, 900, "Dua"),
    createBubble(page.panels[1].id, "pikir", 300, 700, "Tiga"),
  ];
  page.bubbles[1].visible = false;
  page.bubbles[0].tail = { dx: -15, dy: 77 };
  return page;
}

/** Simulasikan baris DB lalu susun jadi hasil query bersarang (urutan acak seperti PostgREST). */
function roundTrip(pages: EditorPage[]): EditorPage[] {
  const rows = toRows("c1", pages);
  const nested: NestedPage[] = rows.pages
    .map((pg) => ({
      id: pg.id,
      urutan: pg.urutan,
      template_layout: pg.template_layout,
      panels: rows.panels
        .filter((p) => p.page_id === pg.id)
        .map((p) => ({
          id: p.id,
          urutan: p.urutan,
          // adegan hanya diisi server; di sini meniru isi dari pipeline
          script_json: { adegan: pages.flatMap((x) => x.panels).find((x) => x.id === p.id)!.adegan },
          image_url: null,
          posisi: p.posisi,
          tampil: p.tampil,
          adegan: p.adegan,
          bubbles: rows.bubbles
            .filter((b) => b.panel_id === p.id)
            .map((b) => ({ ...b })),
        }))
        .reverse(),
    }))
    .reverse();
  return fromNested(nested);
}

describe("toRows / fromNested", () => {
  it("menyimpan dan memuat ulang tanpa kehilangan data", () => {
    const pages = [samplePage(), createPage("4-grid")];
    expect(roundTrip(pages)).toEqual(pages);
  });

  it("mempertahankan urutan z balon walau baris datang tidak berurutan", () => {
    const [page] = roundTrip([samplePage()]);
    expect(page.bubbles.map((b) => b.text)).toEqual(["Satu", "Dua", "Tiga"]);
  });

  it("urutan halaman dan panel dimulai dari 1", () => {
    const rows = toRows("c1", [createPage("4-grid"), createPage("1-penuh")]);
    expect(rows.pages.map((p) => p.urutan)).toEqual([1, 2]);
    expect(rows.panels.filter((p) => p.page_id === rows.pages[0].id).map((p) => p.urutan)).toEqual([1, 2, 3, 4]);
  });

  it("baris panel tidak membawa image_url, status, atau script_json dari klien (adegan boleh)", () => {
    const rows = toRows("c1", [samplePage()]);
    for (const p of rows.panels) {
      expect(Object.keys(p).sort()).toEqual(["adegan", "id", "math_elements_json", "page_id", "posisi", "tampil", "urutan"]);
    }
  });
});

describe("EditorPayloadSchema", () => {
  const valid = () => JSON.parse(JSON.stringify([samplePage()]));

  it("menerima payload yang valid", () => {
    expect(EditorPayloadSchema.safeParse(valid()).success).toBe(true);
  });

  it("menolak daftar halaman kosong (mencegah menghapus semua data tak sengaja)", () => {
    expect(EditorPayloadSchema.safeParse([]).success).toBe(false);
  });

  it("menolak id yang bukan UUID", () => {
    const p = valid();
    p[0].id = "page-1";
    expect(EditorPayloadSchema.safeParse(p).success).toBe(false);
  });

  it("menolak layout yang tidak dikenal", () => {
    const p = valid();
    p[0].layoutId = "../../etc";
    expect(EditorPayloadSchema.safeParse(p).success).toBe(false);
  });

  it("menolak teks balon lebih dari 300 karakter", () => {
    const p = valid();
    p[0].bubbles[0].text = "x".repeat(301);
    expect(EditorPayloadSchema.safeParse(p).success).toBe(false);
  });

  it("menolak balon yang menunjuk panel di halaman lain", () => {
    const p = [samplePage(), createPage("1-penuh")];
    p[0].bubbles[0].panelId = p[1].panels[0].id;
    expect(EditorPayloadSchema.safeParse(JSON.parse(JSON.stringify(p))).success).toBe(false);
  });

  it("menolak id ganda", () => {
    const p = valid();
    p[0].bubbles[1].id = p[0].bubbles[0].id;
    expect(EditorPayloadSchema.safeParse(p).success).toBe(false);
  });

  it("menolak koordinat NaN/Infinity dan ukuran font di luar batas", () => {
    const p = valid();
    p[0].bubbles[0].fontSize = 500;
    expect(EditorPayloadSchema.safeParse(p).success).toBe(false);
    const q = valid();
    q[0].bubbles[0].x = 1e12;
    expect(EditorPayloadSchema.safeParse(q).success).toBe(false);
  });

  it("menolak lebih dari 30 halaman", () => {
    const many = Array.from({ length: 31 }, () => createPage("1-penuh"));
    expect(EditorPayloadSchema.safeParse(JSON.parse(JSON.stringify(many))).success).toBe(false);
  });
});
