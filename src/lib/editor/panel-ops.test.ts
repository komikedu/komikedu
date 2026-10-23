import { beforeEach, describe, expect, it } from "vitest";
import { createBubble, createPage, PAGE_MARGIN } from "./factory";
import { EditorPayloadSchema } from "./persist";
import { MAX_PANELS_PER_PAGE, MIN_PANEL, PANEL_GAP, deletePanel, duplicateBubble, duplicatePanel, movePanel, resizePanel, splitPanel } from "./panel-ops";
import { applyPanelImages, clearHistory, undo, useEditor } from "./store";
import { PAGE_H, PAGE_W, type EditorPage } from "./types";

function halaman(): EditorPage {
  const page = createPage("3-satu-atas-dua-bawah", ["atas", "kiri", "kanan"]);
  const [a, b] = page.panels;
  page.bubbles = [
    createBubble(a.id, "bicara", a.x + 150, a.y + 100, "kiri atas"),
    createBubble(a.id, "bicara", a.x + a.w - 150, a.y + 100, "kanan atas"),
    createBubble(b.id, "pikir", b.x + 120, b.y + 100, "panel kiri"),
  ];
  return page;
}

describe("margin halaman", () => {
  it("panel baru tidak menempel ke tepi kanvas", () => {
    for (const p of createPage("4-grid").panels) {
      expect(p.x).toBeGreaterThanOrEqual(PAGE_MARGIN);
      expect(p.y).toBeGreaterThanOrEqual(PAGE_MARGIN);
      expect(p.x + p.w).toBeLessThanOrEqual(PAGE_W - PAGE_MARGIN + 1);
      expect(p.y + p.h).toBeLessThanOrEqual(PAGE_H - PAGE_MARGIN + 1);
    }
  });
});

describe("splitPanel", () => {
  it("horizontal membagi kiri-kanan dengan celah, panel baru tepat setelah asal", () => {
    const page = halaman();
    const asal = { ...page.panels[0] };
    expect(splitPanel(page, asal.id, "horizontal")).toBe(true);
    const [kiri, kanan] = page.panels;
    expect(page.panels).toHaveLength(4);
    expect(kiri.id).toBe(asal.id);
    expect(kanan.x).toBe(kiri.x + kiri.w + PANEL_GAP);
    expect(kiri.w + PANEL_GAP + kanan.w).toBe(asal.w);
    expect(kanan).toMatchObject({ y: asal.y, h: asal.h, adegan: "", imageUrl: null });
  });

  it("vertikal membagi atas-bawah", () => {
    const page = halaman();
    const asal = { ...page.panels[0] };
    splitPanel(page, asal.id, "vertikal");
    const [atas, bawah] = page.panels;
    expect(bawah.y).toBe(atas.y + atas.h + PANEL_GAP);
    expect(atas.h + PANEL_GAP + bawah.h).toBe(asal.h);
  });

  it("balon pindah ke panel tempat titik tengahnya berada", () => {
    const page = halaman();
    splitPanel(page, page.panels[0].id, "horizontal");
    const [kiri, kanan] = page.panels;
    expect(page.bubbles.find((b) => b.text === "kiri atas")?.panelId).toBe(kiri.id);
    expect(page.bubbles.find((b) => b.text === "kanan atas")?.panelId).toBe(kanan.id);
  });

  it("menolak bila hasilnya terlalu kecil atau panel sudah maksimal", () => {
    const page = halaman();
    page.panels[0].w = MIN_PANEL * 2;
    expect(splitPanel(page, page.panels[0].id, "horizontal")).toBe(false);
    const penuh = halaman();
    while (penuh.panels.length < MAX_PANELS_PER_PAGE) penuh.panels.push({ ...penuh.panels[0], id: crypto.randomUUID() });
    expect(splitPanel(penuh, penuh.panels[1].id, "vertikal")).toBe(false);
  });
});

describe("duplicatePanel / deletePanel / duplicateBubble", () => {
  it("duplikat panel beserta balonnya dengan id baru, tetap di dalam halaman", () => {
    const page = halaman();
    const id = duplicatePanel(page, page.panels[0].id)!;
    const salinan = page.panels[1];
    expect(salinan.id).toBe(id);
    expect(salinan.adegan).toBe("atas");
    const balon = page.bubbles.filter((b) => b.panelId === id);
    expect(balon.map((b) => b.text)).toEqual(["kiri atas", "kanan atas"]);
    expect(new Set(page.bubbles.map((b) => b.id)).size).toBe(page.bubbles.length);
    expect(salinan.x + salinan.w).toBeLessThanOrEqual(PAGE_W);
    expect(salinan.y + salinan.h).toBeLessThanOrEqual(PAGE_H);
  });

  it("hapus panel menghapus balonnya, tapi panel terakhir tidak bisa dihapus", () => {
    const page = halaman();
    const a = page.panels[0].id;
    expect(deletePanel(page, a)).toBe(true);
    expect(page.bubbles.some((b) => b.panelId === a)).toBe(false);
    deletePanel(page, page.panels[0].id);
    expect(deletePanel(page, page.panels[0].id)).toBe(false);
    expect(page.panels).toHaveLength(1);
  });

  it("duplikat balon", () => {
    const page = halaman();
    const id = duplicateBubble(page, page.bubbles[0].id)!;
    expect(page.bubbles.find((b) => b.id === id)).toMatchObject({ text: "kiri atas", panelId: page.panels[0].id });
  });
});

describe("movePanel / resizePanel", () => {
  it("geser panel membawa balonnya, dijepit di dalam halaman", () => {
    const page = halaman();
    const p = page.panels[1];
    const balon = page.bubbles.find((b) => b.panelId === p.id)!;
    const px0 = p.x;
    const bx0 = balon.x;
    movePanel(page, p.id, -10_000, 0);
    expect(p.x).toBe(0); // dijepit di tepi kiri
    expect(balon.x).toBe(bx0 - px0); // balon bergeser sejauh panel benar-benar bergeser, bukan -10.000
    const before = { px: p.x, bx: balon.x };
    movePanel(page, p.id, 50, 20);
    expect(p.x - before.px).toBe(50);
    expect(balon.x - before.bx).toBe(50);
  });

  it("ubah ukuran dijepit ke ukuran minimum dan batas halaman", () => {
    const page = halaman();
    const p = page.panels[0];
    resizePanel(page, p.id, { x: 10, y: 10, w: 5, h: 99999 });
    expect(p.w).toBe(MIN_PANEL);
    expect(p.y + p.h).toBe(PAGE_H);
  });

  it("halaman hasil split masih lolos validasi simpan", () => {
    const page = halaman();
    splitPanel(page, page.panels[0].id, "horizontal");
    splitPanel(page, page.panels[2].id, "vertikal");
    expect(EditorPayloadSchema.safeParse(JSON.parse(JSON.stringify([page]))).success).toBe(true);
  });
});

describe("store: operasi panel dan riwayat", () => {
  const st = () => useEditor.getState();
  const page = () => st().pages.find((p) => p.id === st().activePageId)!;

  beforeEach(() => {
    st().init([halaman()]);
    clearHistory();
  });

  it("split lalu undo mengembalikan jumlah panel", () => {
    st().splitPanel(page().panels[0].id, "horizontal");
    expect(page().panels).toHaveLength(4);
    undo();
    expect(page().panels).toHaveLength(3);
  });

  it("duplikat panel memilih salinannya", () => {
    st().duplicatePanel(page().panels[0].id);
    expect(st().selectedId).toBe(page().panels[1].id);
  });

  it("pergeseran sementara saat menyeret tidak masuk riwayat, hasil akhirnya masuk", () => {
    const id = page().panels[1].id;
    const before = useEditor.temporal.getState().pastStates.length;
    st().setDrag({ panelId: id, dx: 10, dy: 0 });
    st().setDrag({ panelId: id, dx: 30, dy: 0 });
    expect(useEditor.temporal.getState().pastStates.length).toBe(before);
    st().movePanel(id, 30, 0);
    expect(st().drag).toBeNull();
    expect(useEditor.temporal.getState().pastStates.length).toBe(before + 1);
  });
});

describe("applyPanelImages", () => {
  const st = () => useEditor.getState();
  const page = () => st().pages.find((p) => p.id === st().activePageId)!;

  beforeEach(() => {
    st().init([halaman()]);
    clearHistory();
  });

  it("memasang gambar tanpa menambah langkah riwayat, dan gambar tetap ada setelah undo", () => {
    st().splitPanel(page().panels[1].id, "horizontal"); // satu langkah riwayat sebelum gambar dibuat
    const id = page().panels[0].id;
    const sebelum = useEditor.temporal.getState().pastStates.length;
    applyPanelImages({ [id]: "https://contoh.supabase.co/panel.webp" });
    expect(page().panels[0].imageUrl).toBe("https://contoh.supabase.co/panel.webp");
    expect(useEditor.temporal.getState().pastStates.length).toBe(sebelum);
    undo(); // membatalkan split, bukan gambar
    expect(page().panels).toHaveLength(3);
    expect(page().panels[0].imageUrl).toBe("https://contoh.supabase.co/panel.webp");
  });
});

describe("isiPanelKosong", () => {
  const st = () => useEditor.getState();
  const page = () => st().pages.find((p) => p.id === st().activePageId)!;

  beforeEach(() => {
    st().init([halaman()]);
    clearHistory();
  });

  it("mengisi adegan dan balon panel kosong dalam satu langkah riwayat, panel berisi tidak ditimpa", () => {
    st().splitPanel(page().panels[0].id, "horizontal");
    const baru = page().panels[1];
    const lama = page().panels[0];
    const balonAwal = page().bubbles.length;
    const sebelum = useEditor.temporal.getState().pastStates.length;

    st().isiPanelKosong(page().id, [
      { id: baru.id, adegan: "Doni menunjuk lampu biru", dialog: [{ karakter: "Doni", jenis: "bicara", teks: "Yang biru tiap 6 detik!" }] },
      { id: lama.id, adegan: "INI TIDAK BOLEH MENIMPA", dialog: [] },
    ]);

    expect(page().panels[1].adegan).toBe("Doni menunjuk lampu biru");
    expect(page().panels[0].adegan).toBe("atas");
    const balonBaru = page().bubbles.filter((b) => b.panelId === baru.id && b.text === "Yang biru tiap 6 detik!");
    expect(balonBaru).toHaveLength(1);
    const b = balonBaru[0];
    expect(b.x).toBeGreaterThanOrEqual(baru.x);
    expect(b.x + b.w).toBeLessThanOrEqual(baru.x + baru.w);
    expect(page().bubbles.length).toBe(balonAwal + 1);
    expect(useEditor.temporal.getState().pastStates.length).toBe(sebelum + 1);

    undo();
    expect(page().panels[1].adegan).toBe("");
    expect(page().bubbles.length).toBe(balonAwal);
  });
});
