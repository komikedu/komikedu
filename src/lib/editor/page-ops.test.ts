import { beforeEach, describe, expect, it } from "vitest";
import { createBubble, createKumpulan, createPage } from "./factory";
import { deletePage, duplicatePage, insertPageAfter } from "./page-ops";
import { EditorPayloadSchema, MAX_PAGES, panelSalinan } from "./persist";
import { clearHistory, undo, useEditor } from "./store";
import type { EditorPage } from "./types";

function halamanBerisi(): EditorPage {
  const page = createPage("2-kiri-kanan");
  const [a] = page.panels;
  a.imageUrl = "https://x.supabase.co/storage/v1/object/public/panels/u/c/a.webp";
  a.adegan = "Joko menghitung apel";
  page.bubbles.push(createBubble(a.id, "bicara", a.x + 100, a.y + 100, "Halo"));
  page.elements.push(createKumpulan(a.id, a.x + 200, a.y + 300));
  return page;
}

describe("operasi halaman", () => {
  it("sisipkan halaman kosong tepat setelah halaman yang dipilih, layout sama", () => {
    const pages = [halamanBerisi(), createPage("1-penuh")];
    const id = insertPageAfter(pages, pages[0].id)!;
    expect(pages.map((p) => p.id)[1]).toBe(id);
    expect(pages).toHaveLength(3);
    expect(pages[1].layoutId).toBe("2-kiri-kanan");
    expect(pages[1].bubbles).toEqual([]);
    expect(pages[1].panels.every((p) => !p.imageUrl)).toBe(true);
  });

  it("duplikat memberi id baru ke semua, menjaga relasi, dan mencatat panel asal bergambar", () => {
    const pages = [halamanBerisi()];
    const asal = pages[0];
    const id = duplicatePage(pages, asal.id)!;
    const salinan = pages[1];
    expect(salinan.id).toBe(id);
    const semuaId = [...pages.flatMap((p) => [p.id, ...p.panels.map((x) => x.id), ...p.bubbles.map((x) => x.id), ...p.elements.map((x) => x.id)])];
    expect(new Set(semuaId).size).toBe(semuaId.length);
    expect(salinan.bubbles[0]).toMatchObject({ text: "Halo", panelId: salinan.panels[0].id });
    expect(salinan.elements[0].panelId).toBe(salinan.panels[0].id);
    expect(salinan.panels[0]).toMatchObject({ imageUrl: asal.panels[0].imageUrl, adegan: "Joko menghitung apel", salinanDari: asal.panels[0].id });
    expect(salinan.panels[1].salinanDari).toBeUndefined();
    // mengubah salinan tidak mengubah asal
    salinan.bubbles[0].text = "Ubah";
    expect(asal.bubbles[0].text).toBe("Halo");
  });

  it("hapus menyisakan minimal satu halaman dan memberi tetangga sebagai halaman berikutnya", () => {
    const pages = [createPage("1-penuh"), createPage("1-penuh"), createPage("1-penuh")];
    const [a, b, c] = pages.map((p) => p.id);
    expect(deletePage(pages, b)).toBe(c);
    expect(deletePage(pages, c)).toBe(a);
    expect(deletePage(pages, a)).toBeNull();
    expect(pages).toHaveLength(1);
  });

  it("batas jumlah halaman", () => {
    const pages = Array.from({ length: MAX_PAGES }, () => createPage("1-penuh"));
    expect(insertPageAfter(pages, pages[0].id)).toBeNull();
    expect(duplicatePage(pages, pages[0].id)).toBeNull();
  });

  it("panelSalinan dan validasi payload", () => {
    const pages = [halamanBerisi()];
    duplicatePage(pages, pages[0].id);
    expect(panelSalinan(pages)).toEqual([{ id: pages[1].panels[0].id, dari: pages[0].panels[0].id }]);
    expect(EditorPayloadSchema.safeParse(JSON.parse(JSON.stringify(pages))).success).toBe(true);
    const buruk = JSON.parse(JSON.stringify(pages));
    buruk[1].panels[0].salinanDari = "bukan-uuid";
    expect(EditorPayloadSchema.safeParse(buruk).success).toBe(false);
  });
});

describe("store halaman", () => {
  const st = () => useEditor.getState();

  beforeEach(() => {
    st().init([createPage("1-penuh"), createPage("1-penuh")]);
    clearHistory();
  });

  it("halaman baru menjadi aktif; hapus lalu undo mengembalikannya", () => {
    const [a, b] = st().pages.map((p) => p.id);
    st().duplicatePage(a);
    expect(st().pages).toHaveLength(3);
    expect(st().activePageId).toBe(st().pages[1].id);
    st().setActivePage(b);
    st().deletePage(b);
    expect(st().pages).toHaveLength(2);
    expect(st().activePageId).not.toBe(b);
    undo();
    expect(st().pages.map((p) => p.id)).toContain(b);
  });

  it("menghapus halaman lain tidak memindahkan halaman aktif", () => {
    const [a, b] = st().pages.map((p) => p.id);
    st().setActivePage(a);
    st().deletePage(b);
    expect(st().activePageId).toBe(a);
  });
});
