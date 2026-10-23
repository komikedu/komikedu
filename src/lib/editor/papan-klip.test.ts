import { beforeEach, describe, expect, it } from "vitest";
import { createBubble, createPage, createStiker, createTeks } from "./factory";
import { adaPapanKlip, potong, salin, tempel } from "./papan-klip";
import { clearHistory, undo, useEditor } from "./store";

const st = () => useEditor.getState();
const aktif = () => st().pages.find((p) => p.id === st().activePageId)!;

let halaman1: string;
let halaman2: string;

beforeEach(() => {
  const a = createPage("2-atas-bawah");
  const b = createPage("2-atas-bawah");
  a.elements.push({ ...createTeks(null, 450, 100, "judul-kuning", "JUDUL"), x: 100, y: 50 }, { ...createTeks(a.panels[0].id, 300, 300, "sfx-ledak", "BUM!"), x: 200, y: 200 }, createStiker("https://cdn/a.png", 1));
  a.bubbles.push({ ...createBubble(a.panels[0].id, "bicara", 300, 250), x: 120, y: 130 }, { ...createBubble(a.panels[1].id, "pikir", 300, 800), x: 150, y: 700 });
  useEditor.setState({ pages: [a, b], activePageId: a.id, selectedId: null, seleksi: [] });
  halaman1 = a.id;
  halaman2 = b.id;
  clearHistory();
});

describe("salin, potong, tempel", () => {
  it("tidak menyalin bila yang dipilih panel atau tidak ada", () => {
    expect(salin()).toBe(false);
    st().select(aktif().panels[0].id);
    expect(salin()).toBe(false);
  });

  it("menyalin teks bergaya ke halaman lain di posisi sama, bebas dari panel, dengan id baru", () => {
    const asli = aktif().elements[0];
    st().select(asli.id);
    expect(salin()).toBe(true);
    expect(adaPapanKlip()).toBe(true);
    st().setActivePage(halaman2);
    expect(tempel()).toBe(true);
    const baru = aktif().elements[0];
    expect(baru).toMatchObject({ kind: "teks", text: "JUDUL", gaya: "judul-kuning", x: 100, y: 50, panelId: null });
    expect(baru.id).not.toBe(asli.id);
    expect(st().selectedId).toBe(baru.id);
    expect(st().pages.find((p) => p.id === halaman1)!.elements).toHaveLength(3); // sumber utuh
  });

  it("elemen terikat panel menjadi bebas di halaman lain tetapi tetap terikat di halaman yang sama", () => {
    const terikat = aktif().elements[1];
    st().select(terikat.id);
    salin();
    tempel(); // halaman yang sama
    const salinan = aktif().elements.at(-1)!;
    expect(salinan.panelId).toBe(terikat.panelId);
    expect(salinan.x).toBe(terikat.x + 24);
    tempel();
    expect(aktif().elements.at(-1)!.x).toBe(terikat.x + 48);
    st().setActivePage(halaman2);
    tempel();
    expect(aktif().elements.at(-1)).toMatchObject({ panelId: null, x: terikat.x });
  });

  it("potong menghapus yang dipilih dan tempel pertama kembali ke posisi semula; undo membatalkan", () => {
    const stiker = aktif().elements[2];
    st().select(stiker.id);
    expect(potong()).toBe(true);
    expect(aktif().elements.some((e) => e.id === stiker.id)).toBe(false);
    tempel();
    expect(aktif().elements.at(-1)).toMatchObject({ kind: "stiker", url: "https://cdn/a.png", x: stiker.x, y: stiker.y });
    undo();
    expect(aktif().elements.filter((e) => e.kind === "stiker")).toHaveLength(0);
  });

  it("menyalin beberapa balon sekaligus ke halaman lain dan menempatkannya di panel di bawahnya", () => {
    const [a, b] = aktif().bubbles.map((x) => x.id);
    st().toggleSeleksiBalon(a);
    st().toggleSeleksiBalon(b);
    expect(salin()).toBe(true);
    st().setActivePage(halaman2);
    tempel();
    const baru = aktif().bubbles;
    expect(baru).toHaveLength(2);
    expect(baru.map((x) => x.text)).toEqual(["Teks baru", "Teks baru"]);
    for (const x of baru) expect(aktif().panels.some((p) => p.id === x.panelId)).toBe(true);
    expect(baru[0].panelId).not.toBe(aktif().panels[1].id); // balon pertama jatuh di panel atas
    expect(baru[1].panelId).toBe(aktif().panels[1].id); // balon kedua di panel bawah
    expect(st().seleksi).toEqual(baru.map((x) => x.id));
    expect(baru.every((x) => x.id !== a && x.id !== b)).toBe(true);
  });

  it("ekor balon tersalin sebagai objek baru, bukan referensi yang sama", () => {
    const b = aktif().bubbles[0];
    st().select(b.id);
    salin();
    st().setActivePage(halaman2);
    tempel();
    const baru = aktif().bubbles[0];
    expect(baru.tail).toEqual(b.tail);
    expect(baru.tail).not.toBe(b.tail);
  });

  it("hasil tempel tidak keluar dari halaman", () => {
    const e = aktif().elements[0];
    useEditor.setState((s) => {
      const el = s.pages[0].elements[0];
      el.x = 900 - el.w;
      el.y = 1200 - el.h;
    });
    st().select(e.id);
    salin();
    tempel();
    const baru = aktif().elements.at(-1)!;
    expect(baru.x + baru.w).toBeLessThanOrEqual(900);
    expect(baru.y + baru.h).toBeLessThanOrEqual(1200);
  });
});
