import { beforeEach, describe, expect, it } from "vitest";
import { createBubble, createPage } from "./factory";
import { clearHistory, undo, useEditor } from "./store";
import { UKURAN_BAWAAN } from "./types";
import { galatUkuran, jenisUkuran, rasioAi, skalakanHalaman, ukuranDariBaris, ukuranDariHalaman, ukuranRender } from "./ukuran-halaman";

describe("galatUkuran", () => {
  it("menerima ukuran wajar dan menolak yang tidak", () => {
    expect(galatUkuran({ w: 900, h: 1200 })).toBeNull();
    expect(galatUkuran({ w: 400, h: 3000 })).toMatch(/3:1/);
    expect(galatUkuran({ w: 399, h: 800 })).toMatch(/kecil/);
    expect(galatUkuran({ w: 3001, h: 3000 })).toMatch(/besar/);
    expect(galatUkuran({ w: 900.5, h: 1200 })).toMatch(/bulat/);
    expect(galatUkuran({ w: "900", h: 1200 })).toMatch(/bulat/);
  });
});

describe("jenis dan rasio", () => {
  it("mengenali preset dan ukuran kustom", () => {
    expect(jenisUkuran({ w: 900, h: 1200 })).toBe("vertikal");
    expect(jenisUkuran({ w: 1200, h: 1200 })).toBe("kotak");
    expect(jenisUkuran({ w: 1200, h: 900 })).toBe("horizontal");
    expect(jenisUkuran({ w: 1000, h: 1000 })).toBe("kustom");
  });
  it("rasio AI terdekat", () => {
    expect(rasioAi({ w: 900, h: 1200 })).toBe("3:4");
    expect(rasioAi({ w: 1000, h: 1000 })).toBe("1:1");
    expect(rasioAi({ w: 1920, h: 1080 })).toBe("16:9");
    expect(rasioAi({ w: 800, h: 1400 })).toBe("9:16");
  });
  it("ukuran dari baris database jatuh ke bawaan bila kosong atau tidak valid", () => {
    expect(ukuranDariBaris({ lebar_halaman: 1200, tinggi_halaman: 900 })).toEqual({ w: 1200, h: 900 });
    expect(ukuranDariBaris({})).toEqual(UKURAN_BAWAAN);
    expect(ukuranDariBaris({ lebar_halaman: 10, tinggi_halaman: 9000 })).toEqual(UKURAN_BAWAAN);
    expect(ukuranDariBaris(null)).toEqual(UKURAN_BAWAAN);
  });
  it("gambar halaman render: sisi terpanjang 1800, ukuran lama 1350 x 1800", () => {
    expect(ukuranRender({ w: 900, h: 1200 })).toEqual({ lebar: 1350, tinggi: 1800, skala: 1.5 });
    expect(ukuranRender({ w: 1200, h: 1200 })).toMatchObject({ lebar: 1800, tinggi: 1800 });
  });
});

describe("createPage dengan ukuran", () => {
  it("panel memenuhi area dalam margin halaman berukuran lain", () => {
    const p = createPage("1-penuh", [], { w: 1200, h: 1200 });
    expect(p).toMatchObject({ w: 1200, h: 1200 });
    expect(p.panels[0].x + p.panels[0].w).toBe(1200 - 54);
    expect(p.panels[0].y + p.panels[0].h).toBe(1200 - 54);
  });
});

describe("skalakanHalaman", () => {
  const contoh = () => {
    const p = createPage("3-satu-atas-dua-bawah");
    p.bubbles.push(createBubble(p.panels[0].id, "bicara", 450, 300), createBubble(p.panels[1].id, "narasi", 300, 900));
    p.panels[0].imageUrl = "https://img.test/a.webp";
    p.panels[1].imageUrl = "https://img.test/b.webp";
    p.panels[1].imageRect = { x: p.panels[1].x - 30, y: p.panels[1].y - 20, w: p.panels[1].w + 60, h: p.panels[1].h + 90 };
    return p;
  };

  it("menskalakan panel dan posisi; ukuran yang sama dikembalikan apa adanya", () => {
    const p = contoh();
    expect(skalakanHalaman([p], { w: 900, h: 1200 })[0]).toBe(p);
    const [k] = skalakanHalaman([p], { w: 1200, h: 1200 });
    expect(k).toMatchObject({ w: 1200, h: 1200 });
    for (const panel of k.panels) {
      expect(panel.x + panel.w).toBeLessThanOrEqual(1200);
      expect(panel.y + panel.h).toBeLessThanOrEqual(1200);
    }
    expect(k.panels[0].x).toBe(Math.round(p.panels[0].x * (1200 / 900)));
    expect(k.panels[0].y).toBe(p.panels[0].y);
  });

  it("gambar panel yang belum diatur guru tetap otomatis (tanpa imageRect) sehingga tidak membesar", () => {
    const [k] = skalakanHalaman([contoh()], { w: 1200, h: 900 });
    expect(k.panels[0].imageRect).toBeUndefined();
    expect(k.panels[0].imageUrl).toBe("https://img.test/a.webp");
  });

  it("gambar yang diatur guru berubah seragam: rasionya tetap", () => {
    const p = contoh();
    const [k] = skalakanHalaman([p], { w: 1200, h: 900 });
    const asal = p.panels[1].imageRect!;
    const baru = k.panels[1].imageRect!;
    expect(baru.w / baru.h).toBeCloseTo(asal.w / asal.h, 1);
  });

  it("balon tidak mengecil saat berpindah dari vertikal ke horizontal (skala rata-rata geometrik)", () => {
    const p = contoh();
    const [k] = skalakanHalaman([p], { w: 1200, h: 900 });
    expect(Math.abs(k.bubbles[0].w - p.bubbles[0].w)).toBeLessThanOrEqual(1);
    expect(Math.abs(k.bubbles[0].fontSize - p.bubbles[0].fontSize)).toBeLessThanOrEqual(1);
  });

  it("bolak-balik antar ukuran tidak menumpuk: kembali ke ukuran semula hampir sama persis", () => {
    const p = contoh();
    let pages = [p];
    for (const u of [{ w: 1200, h: 900 }, { w: 1200, h: 1200 }, { w: 900, h: 1200 }, { w: 1200, h: 900 }, { w: 900, h: 1200 }]) pages = skalakanHalaman(pages, u);
    const [k] = pages;
    const dekat = (a: number, b: number) => Math.abs(a - b) <= 4;
    expect(k).toMatchObject({ w: 900, h: 1200 });
    k.panels.forEach((panel, i) => {
      for (const f of ["x", "y", "w", "h"] as const) expect(dekat(panel[f], p.panels[i][f])).toBe(true);
    });
    for (const f of ["x", "y", "w", "h", "fontSize"] as const) expect(dekat(k.bubbles[0][f], p.bubbles[0][f])).toBe(true);
    for (const f of ["x", "y", "w", "h"] as const) expect(dekat(k.panels[1].imageRect![f], p.panels[1].imageRect![f])).toBe(true);
  });
});

describe("ubahUkuranHalaman di store", () => {
  beforeEach(() => {
    const p = createPage("2-atas-bawah");
    useEditor.setState({ pages: [p], activePageId: p.id, selectedId: null, seleksi: [] });
    clearHistory();
  });

  it("mengubah semua halaman, halaman baru memakai ukuran itu, dan bisa di-undo", () => {
    const st = () => useEditor.getState();
    st().ubahUkuranHalaman({ w: 1200, h: 900 });
    expect(ukuranDariHalaman(st().pages)).toEqual({ w: 1200, h: 900 });
    st().addPage("1-penuh");
    expect(st().pages[1]).toMatchObject({ w: 1200, h: 900 });
    st().insertPageAfter(st().pages[0].id);
    expect(st().pages[1]).toMatchObject({ w: 1200, h: 900 });
    st().duplicatePage(st().pages[0].id);
    expect(st().pages.every((x) => x.w === 1200 && x.h === 900)).toBe(true);
    undo();
    undo();
    undo();
    undo();
    expect(ukuranDariHalaman(st().pages)).toEqual(UKURAN_BAWAAN);
  });

  it("menolak ukuran tidak valid", () => {
    useEditor.getState().ubahUkuranHalaman({ w: 100, h: 100 });
    expect(ukuranDariHalaman(useEditor.getState().pages)).toEqual(UKURAN_BAWAAN);
  });

  it("balon baru dijepit di dalam halaman berukuran kecil", () => {
    const st = () => useEditor.getState();
    st().ubahUkuranHalaman({ w: 600, h: 600 });
    const panelId = st().pages[0].panels[0].id;
    st().addBubble(panelId, "bicara", 590, 590);
    const b = st().pages[0].bubbles[0];
    expect(b.x + b.w).toBeLessThanOrEqual(600);
    expect(b.y + b.h).toBeLessThanOrEqual(600);
  });
});
