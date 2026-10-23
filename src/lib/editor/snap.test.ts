import { describe, expect, it } from "vitest";
import { createPage, PAGE_MARGIN } from "./factory";
import { PANEL_GAP, isConvexQuad, movePanel, panelCorners, resetCorners, resizePanel, setCorner, splitPanel } from "./panel-ops";
import { EditorPayloadSchema, fromNested, toRows, type NestedPage } from "./persist";
import { nearest, snapPoint, snapRectMove, snapTargets } from "./snap";

describe("sudut panel miring", () => {
  it("menggeser satu sudut membuat panel miring dan kotak pembatasnya ikut menyesuaikan", () => {
    const page = createPage("2-kiri-kanan");
    const p = page.panels[0];
    const kananAtas = { ...panelCorners(p)[1] };
    expect(setCorner(page, p.id, 1, { x: kananAtas.x + 60, y: kananAtas.y })).toBe(true);
    expect(p.corners).toHaveLength(4);
    expect(p.w).toBe(kananAtas.x + 60 - p.x);
    expect(isConvexQuad(p.corners!)).toBe(true);
  });

  it("menolak bentuk terbalik atau tidak cembung", () => {
    const page = createPage("1-penuh");
    const p = page.panels[0];
    const [, , , kiriBawah] = panelCorners(p);
    // tarik sudut kanan-atas melewati sisi kiri: bentuk terbalik
    expect(setCorner(page, p.id, 1, { x: kiriBawah.x - 50, y: p.y })).toBe(false);
    expect(p.corners ?? null).toBeNull();
  });

  it("kembali jadi panel kotak bila sudutnya dikembalikan ke posisi kotak", () => {
    const page = createPage("1-penuh");
    const p = page.panels[0];
    const asli = { ...panelCorners(p)[1] };
    setCorner(page, p.id, 1, { x: asli.x - 40, y: asli.y });
    setCorner(page, p.id, 1, asli);
    expect(p.corners ?? null).toBeNull();
  });

  it("geser dan ubah ukuran ikut memindah dan menskalakan sudut", () => {
    const page = createPage("1-penuh");
    const p = page.panels[0];
    setCorner(page, p.id, 2, { x: p.x + p.w - 100, y: p.y + p.h });
    const sebelum = panelCorners(p).map((c) => ({ ...c }));
    movePanel(page, p.id, -20, -20);
    expect(p.corners!.map((c, i) => [c.x - sebelum[i].x, c.y - sebelum[i].y])).toEqual(Array(4).fill([-20, -20]));
    resizePanel(page, p.id, { x: p.x, y: p.y, w: p.w / 2, h: p.h });
    expect(isConvexQuad(p.corners!)).toBe(true);
    expect(Math.max(...p.corners!.map((c) => c.x))).toBeLessThanOrEqual(p.x + p.w + 1);
  });

  it("split dan reset mengembalikan panel jadi kotak", () => {
    const page = createPage("1-penuh");
    const p = page.panels[0];
    setCorner(page, p.id, 1, { x: p.x + p.w - 80, y: p.y });
    splitPanel(page, p.id, "horizontal");
    expect(page.panels.every((x) => !x.corners)).toBe(true);
    setCorner(page, p.id, 0, { x: p.x + 30, y: p.y });
    expect(resetCorners(page, p.id)).toBe(true);
    expect(p.corners).toBeNull();
  });

  it("sudut miring lolos validasi dan TIDAK hilang saat disimpan lalu dimuat ulang", () => {
    const page = createPage("2-kiri-kanan");
    setCorner(page, page.panels[0].id, 1, { x: page.panels[0].x + page.panels[0].w + 40, y: page.panels[0].y });
    const parsed = EditorPayloadSchema.safeParse(JSON.parse(JSON.stringify([page])));
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data[0].panels[0].corners).toEqual(page.panels[0].corners);

    const rows = toRows("c1", parsed.success ? parsed.data : []);
    expect(rows.panels[0].posisi.corners).toEqual(page.panels[0].corners);
    expect(rows.panels[1].posisi.corners).toBeUndefined(); // panel kotak tidak menyimpan sudut

    const nested: NestedPage[] = [
      {
        id: page.id,
        urutan: 1,
        template_layout: page.layoutId,
        panels: rows.panels.map((r) => ({ id: r.id, urutan: r.urutan, script_json: null, image_url: null, posisi: r.posisi, tampil: r.tampil, adegan: r.adegan, bubbles: [] })),
      },
    ];
    const [back] = fromNested(nested);
    expect(back.panels[0].corners).toEqual(page.panels[0].corners);
    expect(back.panels[1].corners).toBeUndefined();
  });

  it("menolak sudut yang jumlahnya bukan 4", () => {
    const page = createPage("1-penuh");
    const data = JSON.parse(JSON.stringify([page]));
    data[0].panels[0].corners = [{ x: 0, y: 0 }];
    expect(EditorPayloadSchema.safeParse(data).success).toBe(false);
  });
});

describe("snapping", () => {
  it("nearest memilih garis terdekat dalam jarak tempel", () => {
    expect(nearest(103, [0, 100, 110], 10)).toBe(100);
    expect(nearest(150, [0, 100], 10)).toBeNull();
  });

  it("titik menempel ke margin halaman dan sudut panel lain", () => {
    const page = createPage("2-kiri-kanan");
    const [kiri, kanan] = page.panels;
    const t = snapTargets(page, kanan.id);
    // dekat margin kiri halaman
    expect(snapPoint({ x: PAGE_MARGIN + 4, y: 500 }, t).pt.x).toBe(PAGE_MARGIN);
    // dekat posisi "satu celah" di kanan panel kiri: jarak antar panel tetap seragam
    const r = snapPoint({ x: kiri.x + kiri.w + PANEL_GAP + 3, y: kiri.y - 2 }, t);
    expect(r.pt).toEqual({ x: kiri.x + kiri.w + PANEL_GAP, y: kiri.y });
    expect(r.guides.x).toEqual([kiri.x + kiri.w + PANEL_GAP]);
  });

  it("panel yang digeser menempel tepinya ke panel lain", () => {
    const page = createPage("2-kiri-kanan");
    const [kiri, kanan] = page.panels;
    const t = snapTargets(page, kanan.id);
    const usul = { x: kanan.x + 6, y: kanan.y - 7, w: kanan.w, h: kanan.h };
    const s = snapRectMove(usul, t);
    expect(usul.x + s.dx).toBe(kiri.x + kiri.w + PANEL_GAP);
    expect(usul.y + s.dy).toBe(kiri.y);
  });

  it("tidak menempel bila terlalu jauh", () => {
    const page = createPage("2-kiri-kanan");
    const t = snapTargets(page, page.panels[1].id);
    expect(snapRectMove({ x: 300, y: 300, w: 100, h: 100 }, t, 2)).toMatchObject({ dx: 0, dy: 0 });
  });
});

describe("prioritas garis sejajar persis", () => {
  it("garis sejajar persis menang atas garis satu-celah walau jaraknya sama", () => {
    const t = { xs: [], ys: [611], xsGap: [], ysGap: [627] };
    expect(snapPoint({ x: 0, y: 619 }, t, 11).pt.y).toBe(611);
  });

  it("garis satu-celah dipakai bila tidak ada garis sejajar persis dalam jangkauan", () => {
    const t = { xs: [], ys: [500], xsGap: [], ysGap: [627] };
    expect(snapPoint({ x: 0, y: 622 }, t, 10).pt.y).toBe(627);
  });

  it("kasus nyata: sudut panel bawah-kiri kembali menempel ke tepi atas panel tetangga", () => {
    const page = createPage("3-satu-atas-dua-bawah");
    const [, kiri, kanan] = page.panels;
    const t = snapTargets(page, kiri.id);
    const r = snapPoint({ x: kiri.x + kiri.w - 5, y: kanan.y + 8 }, t, 11);
    expect(r.pt.y).toBe(kanan.y);
  });
});
