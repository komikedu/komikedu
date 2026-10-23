import { beforeEach, describe, expect, it } from "vitest";
import { createBubble, createPage } from "./factory";
import { clearHistory, seleksiAktif, undo, useEditor } from "./store";

const st = () => useEditor.getState();
const halaman = () => st().pages[0];

beforeEach(() => {
  const p = createPage("2-atas-bawah");
  p.bubbles.push(createBubble(p.panels[0].id, "bicara", 200, 200), createBubble(p.panels[0].id, "bicara", 300, 300), createBubble(p.panels[1].id, "pikir", 400, 800));
  useEditor.setState({ pages: [p], activePageId: p.id, selectedId: null, seleksi: [] });
  clearHistory();
});

describe("pilih beberapa balon", () => {
  it("klik biasa memilih satu balon; Shift+klik menambah dan melepas", () => {
    const [a, b, c] = halaman().bubbles.map((x) => x.id);
    st().toggleSeleksiBalon(a);
    expect(st().selectedId).toBe(a);
    expect(seleksiAktif(st().seleksi, st().selectedId)).toEqual([]);
    st().toggleSeleksiBalon(b);
    expect(seleksiAktif(st().seleksi, st().selectedId)).toEqual([a, b]);
    st().toggleSeleksiBalon(c);
    expect(seleksiAktif(st().seleksi, st().selectedId)).toEqual([a, b, c]);
    st().toggleSeleksiBalon(b);
    expect(seleksiAktif(st().seleksi, st().selectedId)).toEqual([a, c]);
    st().toggleSeleksiBalon(c);
    expect(seleksiAktif(st().seleksi, st().selectedId)).toEqual([]);
    expect(st().selectedId).toBe(a);
  });
  it("memilih dari panel atau kosong lalu Shift+klik tetap menjadi pilihan tunggal dulu", () => {
    const [a] = halaman().bubbles.map((x) => x.id);
    st().select(halaman().panels[0].id);
    st().toggleSeleksiBalon(a);
    expect(st().selectedId).toBe(a);
    expect(st().seleksi).toEqual([]);
  });
  it("pilih biasa, ganti halaman, atau pilih panel mengakhiri pilihan bersama", () => {
    const ids = halaman().bubbles.map((x) => x.id);
    st().pilihSemuaBalon();
    expect(seleksiAktif(st().seleksi, st().selectedId)).toEqual(ids);
    st().select(ids[1]);
    expect(seleksiAktif(st().seleksi, st().selectedId)).toEqual([]);
    st().pilihSemuaBalon();
    st().setActivePage(halaman().id);
    expect(st().seleksi).toEqual([]);
  });
  it("seleksi yang tidak memuat balon utama dianggap tidak aktif", () => {
    expect(seleksiAktif(["a", "b"], "c")).toEqual([]);
    expect(seleksiAktif(["a", "b"], null)).toEqual([]);
    expect(seleksiAktif(["a"], "a")).toEqual([]);
  });
  it("tidak menerima id yang bukan balon halaman ini", () => {
    st().toggleSeleksiBalon("tidak-ada");
    expect(st().selectedId).toBeNull();
  });
  it("pilih semua hanya balon yang terlihat", () => {
    const b = halaman().bubbles;
    useEditor.setState((s) => {
      s.pages[0].bubbles[2].visible = false;
    });
    st().pilihSemuaBalon();
    expect(st().seleksi).toEqual([b[0].id, b[1].id]);
  });
});

describe("aksi massal", () => {
  it("mengubah ukuran huruf semua balon terpilih dalam satu langkah riwayat lalu bisa di-undo", () => {
    const [a, b, c] = halaman().bubbles.map((x) => x.id);
    const awal = halaman().bubbles.map((x) => x.fontSize);
    st().updateBalonBanyak([a, b], { fontSize: 34 });
    expect(halaman().bubbles.map((x) => x.fontSize)).toEqual([34, 34, awal[2]]);
    expect(halaman().bubbles.find((x) => x.id === c)!.fontSize).toBe(awal[2]);
    undo();
    expect(halaman().bubbles.map((x) => x.fontSize)).toEqual(awal);
  });
  it("menghapus balon terpilih sekaligus dan mengosongkan pilihan", () => {
    const ids = halaman().bubbles.map((x) => x.id);
    st().toggleSeleksiBalon(ids[0]);
    st().toggleSeleksiBalon(ids[1]);
    st().deleteBalonBanyak([ids[0], ids[1]]);
    expect(halaman().bubbles.map((x) => x.id)).toEqual([ids[2]]);
    expect(st().selectedId).toBeNull();
    expect(st().seleksi).toEqual([]);
  });
});

describe("geser balon yang dipilih bersama", () => {
  it("menggeser semua balon terpilih sama jauh dan membiarkan yang lain", () => {
    const [a, b, c] = halaman().bubbles;
    const awal = [a, b, c].map((x) => ({ x: x.x, y: x.y }));
    st().geserBalonBanyak([a.id, b.id], 30, -12);
    const [a2, b2, c2] = halaman().bubbles;
    expect({ x: a2.x, y: a2.y }).toEqual({ x: awal[0].x + 30, y: awal[0].y - 12 });
    expect({ x: b2.x, y: b2.y }).toEqual({ x: awal[1].x + 30, y: awal[1].y - 12 });
    expect({ x: c2.x, y: c2.y }).toEqual(awal[2]);
  });
  it("satu kali undo mengembalikan semuanya", () => {
    const [a, b] = halaman().bubbles;
    const awal = [a.x, b.x];
    st().geserBalonBanyak([a.id, b.id], 50, 50);
    undo();
    expect(halaman().bubbles.slice(0, 2).map((x) => x.x)).toEqual(awal);
  });
  it("pergeseran nol tidak mencatat langkah riwayat", () => {
    const [a, b] = halaman().bubbles;
    st().geserBalonBanyak([a.id, b.id], 0, 0);
    expect(useEditor.temporal.getState().pastStates.length).toBe(0);
  });
});
