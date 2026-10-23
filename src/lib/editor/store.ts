import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { temporal } from "zundo";
import { gantiNamaDiTeks, type GantiNama } from "@/lib/comics/tokoh";
import { panelDiTitik } from "./lepas-gambar";
import { createBubble, createKumpulan, createPage, createStiker, createTeks, newId } from "./factory";
import { layoutBubbles } from "./from-script";
import { deletePage, duplicatePage, insertPageAfter } from "./page-ops";
import { deletePanel, duplicateBubble, duplicateElement, duplicatePanel, movePanel, resetCorners, resizePanel, setCorner, setImageRect, setLatar, splitPanel, type SplitArah } from "./panel-ops";
import { PAGE_H, PAGE_W } from "./types";
import type { Bubble, BubbleKind, EditorPage, ElemenKumpulan, ElemenTeks, Latar, MathElement, Panel, Point } from "./types";

/** Isi papan klip internal editor: elemen dan balon yang disalin, bisa ditempel di halaman mana pun. */
export type IsiPapanKlip = { elemen: MathElement[]; balon: Bubble[] };

type Tool = "move" | "text" | "mat" | "teksgaya" | "pan";

type EditorState = {
  pages: EditorPage[];
  activePageId: string;
  selectedId: string | null;
  /** Balon yang dipilih bersama (Shift/Ctrl+klik); berlaku bila ada minimal dua dan memuat selectedId. Lihat seleksiAktif. */
  seleksi: string[];
  tool: Tool;
  zoom: number;
  /** Pergeseran sementara saat panel diseret (agar balonnya ikut terlihat bergerak); tidak masuk riwayat. */
  drag: { panelId: string; dx: number; dy: number } | null;
  /** Panel yang sedang diubah sudutnya (mode miring); tidak masuk riwayat. */
  cornerEdit: string | null;
  /** Layer yang dipilih pada panel terpilih: bingkai panel atau gambar di dalamnya. */
  selectedLayer: "panel" | "gambar";

  init: (pages: EditorPage[]) => void;
  setActivePage: (id: string) => void;
  select: (id: string | null) => void;
  /** Tambah atau lepas sebuah balon dari pilihan bersama (Shift/Ctrl+klik). */
  toggleSeleksiBalon: (id: string) => void;
  /** Pilih semua balon yang terlihat di halaman aktif. */
  pilihSemuaBalon: () => void;
  /** Tempel isi papan klip ke halaman aktif, digeser `geser` unit; yang ditempel menjadi pilihan. */
  tempelData: (isi: IsiPapanKlip, geser: number) => void;
  /** Ubah beberapa balon sekaligus sebagai satu langkah riwayat. */
  updateBalonBanyak: (ids: string[], patch: Partial<Omit<Bubble, "id" | "panelId">>) => void;
  deleteBalonBanyak: (ids: string[]) => void;
  /** Geser beberapa balon sekaligus sebagai satu langkah riwayat (seret balon yang dipilih bersama). */
  geserBalonBanyak: (ids: string[], dx: number, dy: number) => void;
  setTool: (tool: Tool) => void;
  setZoom: (zoom: number) => void;
  addPage: (layoutId: string) => void;
  /** Sisipkan halaman kosong, duplikat, atau hapus halaman; halaman baru menjadi aktif. */
  insertPageAfter: (id: string) => void;
  duplicatePage: (id: string) => void;
  deletePage: (id: string) => void;
  addBubble: (panelId: string, kind: BubbleKind, cx: number, cy: number) => void;
  updateBubble: (id: string, patch: Partial<Omit<Bubble, "id" | "panelId">>) => void;
  deleteBubble: (id: string) => void;
  duplicateBubble: (id: string) => void;
  setDrag: (drag: EditorState["drag"]) => void;
  /** panelId null = elemen bebas di halaman */
  addKumpulan: (panelId: string | null, cx: number, cy: number) => void;
  addTeksGaya: (panelId: string | null, cx: number, cy: number) => void;
  /** stiker bebas dari sebuah gambar; rasio = lebar / tinggi gambar */
  addStiker: (url: string, rasio: number) => void;
  /** lepas elemen dari panelnya (bebas) atau ikat ke panel di bawah titik tengahnya */
  ikatElemen: (id: string, bebas: boolean) => void;
  updateElement: (id: string, patch: Partial<Omit<ElemenKumpulan, "id" | "panelId" | "kind">> & Partial<Omit<ElemenTeks, "id" | "panelId" | "kind">>) => void;
  deleteElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  setCornerEdit: (panelId: string | null) => void;
  /** Pilih layer gambar sebuah panel (untuk digeser dan diubah ukurannya). */
  selectImage: (panelId: string) => void;
  setImageRect: (panelId: string, rect: { x: number; y: number; w: number; h: number } | null) => void;
  setLatar: (panelId: string, latar: Latar | null) => void;
  setCorner: (panelId: string, index: number, pt: Point) => void;
  resetCorners: (panelId: string) => void;
  movePanel: (id: string, dx: number, dy: number) => void;
  resizePanel: (id: string, rect: { x: number; y: number; w: number; h: number }) => void;
  splitPanel: (id: string, arah: SplitArah) => void;
  duplicatePanel: (id: string) => void;
  deletePanel: (id: string) => void;
  updatePanel: (id: string, patch: Partial<Pick<Panel, "visible" | "adegan">>) => void;
  /** Isi panel yang adegannya kosong dengan hasil AI (adegan + balon dialog), sebagai satu langkah riwayat. */
  /** Ganti nama tokoh di semua balon dan adegan (satu langkah undo). */
  gantiNamaTokoh: (ganti: GantiNama[]) => void;
  isiPanelKosong: (pageId: string, hasil: { id: string; adegan: string; dialog: { karakter: string; jenis: Bubble["kind"]; teks: string }[] }[]) => void;
};

export const useEditor = create<EditorState>()(
  temporal(
    immer((set) => ({
      pages: [],
      activePageId: "",
      selectedId: null,
      seleksi: [],
      tool: "move",
      zoom: 1,
      drag: null,
      cornerEdit: null,
      selectedLayer: "panel",

      init: (pages) =>
        set((s) => {
          s.pages = pages;
          s.activePageId = pages[0]?.id ?? "";
          s.selectedId = null;
          s.seleksi = [];
        }),
      setActivePage: (id) =>
        set((s) => {
          s.activePageId = id;
          s.selectedId = null;
          s.seleksi = [];
        }),
      toggleSeleksiBalon: (id) =>
        set((s) => {
          const page = s.pages.find((p) => p.id === s.activePageId);
          if (!page?.bubbles.some((b) => b.id === id)) return;
          const sekarang = seleksiAktif(s.seleksi, s.selectedId);
          const awal = sekarang.length ? sekarang : s.selectedId && page.bubbles.some((b) => b.id === s.selectedId) ? [s.selectedId] : [];
          const baru = awal.includes(id) ? awal.filter((x) => x !== id) : [...awal, id];
          s.selectedLayer = "panel";
          s.cornerEdit = null;
          s.selectedId = baru[0] ?? null;
          s.seleksi = baru.length >= 2 ? baru : [];
        }),
      pilihSemuaBalon: () =>
        set((s) => {
          const page = s.pages.find((p) => p.id === s.activePageId);
          const ids = page?.bubbles.filter((b) => b.visible).map((b) => b.id) ?? [];
          if (!ids.length) return;
          s.selectedLayer = "panel";
          s.cornerEdit = null;
          s.selectedId = ids[0];
          s.seleksi = ids.length >= 2 ? ids : [];
        }),
      tempelData: (isi, geser) =>
        set((s) => {
          const page = s.pages.find((p) => p.id === s.activePageId);
          if (!page) return;
          const terlihat = page.panels.filter((p) => p.visible);
          const batas = (n: number, maks: number) => Math.max(0, Math.min(n, Math.max(0, maks)));
          const elemenBaru: MathElement[] = isi.elemen.map((e) => ({
            ...e,
            id: newId(),
            // terikat ke panel hanya bila panel itu ada di halaman ini; selain itu menjadi elemen bebas
            panelId: e.panelId && page.panels.some((p) => p.id === e.panelId) ? e.panelId : null,
            x: Math.round(batas(e.x + geser, PAGE_W - e.w)),
            y: Math.round(batas(e.y + geser, PAGE_H - e.h)),
          }));
          const balonBaru: Bubble[] = [];
          for (const b of isi.balon) {
            const x = Math.round(batas(b.x + geser, PAGE_W - b.w));
            const y = Math.round(batas(b.y + geser, PAGE_H - b.h));
            const panel = page.panels.find((p) => p.id === b.panelId) ?? panelDiTitik(terlihat, { x: x + b.w / 2, y: y + b.h / 2 }) ?? terlihat[0];
            if (panel) balonBaru.push({ ...b, id: newId(), panelId: panel.id, x, y, tail: b.tail ? { ...b.tail } : null });
          }
          if (!elemenBaru.length && !balonBaru.length) return;
          page.elements.push(...elemenBaru);
          page.bubbles.push(...balonBaru);
          const ids = [...balonBaru.map((b) => b.id), ...elemenBaru.map((e) => e.id)];
          s.selectedLayer = "panel";
          s.cornerEdit = null;
          s.selectedId = ids[0];
          s.seleksi = balonBaru.length >= 2 && !elemenBaru.length ? balonBaru.map((b) => b.id) : [];
        }),
      updateBalonBanyak: (ids, patch) =>
        set((s) => {
          const page = s.pages.find((p) => p.id === s.activePageId);
          if (!page) return;
          for (const b of page.bubbles) if (ids.includes(b.id)) Object.assign(b, patch);
        }),
      deleteBalonBanyak: (ids) =>
        set((s) => {
          const page = s.pages.find((p) => p.id === s.activePageId);
          if (!page) return;
          page.bubbles = page.bubbles.filter((b) => !ids.includes(b.id));
          s.selectedId = null;
          s.seleksi = [];
        }),
      geserBalonBanyak: (ids, dx, dy) =>
        set((s) => {
          if (!dx && !dy) return;
          const page = s.pages.find((p) => p.id === s.activePageId);
          if (!page) return;
          for (const b of page.bubbles) {
            if (!ids.includes(b.id)) continue;
            b.x += dx;
            b.y += dy;
          }
        }),
      select: (id) =>
        set((s) => {
          s.seleksi = [];
          s.selectedId = id;
          s.selectedLayer = "panel";
          if (s.cornerEdit !== id) s.cornerEdit = null;
        }),
      setTool: (tool) =>
        set((s) => {
          s.tool = tool;
        }),
      setZoom: (zoom) =>
        set((s) => {
          s.zoom = Math.min(3, Math.max(0.25, zoom));
        }),

      addPage: (layoutId) =>
        set((s) => {
          const page = createPage(layoutId);
          s.pages.push(page);
          s.activePageId = page.id;
          s.selectedId = null;
        }),

      insertPageAfter: (id) =>
        set((s) => {
          const baru = insertPageAfter(s.pages, id);
          if (!baru) return;
          s.activePageId = baru;
          s.selectedId = null;
        }),
      duplicatePage: (id) =>
        set((s) => {
          const baru = duplicatePage(s.pages, id);
          if (!baru) return;
          s.activePageId = baru;
          s.selectedId = null;
        }),
      deletePage: (id) =>
        set((s) => {
          const berikut = deletePage(s.pages, id);
          if (!berikut) return;
          if (s.activePageId === id || !s.pages.some((p) => p.id === s.activePageId)) s.activePageId = berikut;
          s.selectedId = null;
        }),

      addBubble: (panelId, kind, cx, cy) =>
        set((s) => {
          const page = s.pages.find((p) => p.id === s.activePageId);
          if (!page || !page.panels.some((p) => p.id === panelId)) return;
          const bubble = createBubble(panelId, kind, cx, cy);
          page.bubbles.push(bubble);
          s.selectedId = bubble.id;
          s.tool = "move";
        }),

      updateBubble: (id, patch) =>
        set((s) => {
          for (const page of s.pages) {
            const b = page.bubbles.find((x) => x.id === id);
            if (b) Object.assign(b, patch);
          }
        }),

      deleteBubble: (id) =>
        set((s) => {
          for (const page of s.pages) page.bubbles = page.bubbles.filter((b) => b.id !== id);
          if (s.selectedId === id) s.selectedId = null;
        }),

      duplicateBubble: (id) =>
        set((s) => {
          const page = s.pages.find((p) => p.id === s.activePageId);
          const baru = page && duplicateBubble(page, id);
          if (baru) s.selectedId = baru;
        }),

      setDrag: (drag) =>
        set((s) => {
          s.drag = drag;
        }),

      addKumpulan: (panelId, cx, cy) =>
        set((s) => {
          const page = s.pages.find((p) => p.id === s.activePageId);
          if (!page || (panelId !== null && !page.panels.some((p) => p.id === panelId))) return;
          const el = createKumpulan(panelId, cx, cy);
          page.elements.push(el);
          s.selectedId = el.id;
          s.selectedLayer = "panel";
          s.tool = "move";
        }),

      addTeksGaya: (panelId, cx, cy) =>
        set((s) => {
          const page = s.pages.find((p) => p.id === s.activePageId);
          if (!page || (panelId !== null && !page.panels.some((p) => p.id === panelId))) return;
          const el = createTeks(panelId, cx, cy);
          page.elements.push(el);
          s.selectedId = el.id;
          s.selectedLayer = "panel";
          s.tool = "move";
        }),

      addStiker: (url, rasio) =>
        set((s) => {
          const page = s.pages.find((p) => p.id === s.activePageId);
          if (!page) return;
          const el = createStiker(url, rasio);
          page.elements.push(el);
          s.selectedId = el.id;
          s.selectedLayer = "panel";
          s.tool = "move";
        }),

      ikatElemen: (id, bebas) =>
        set((s) => {
          const page = s.pages.find((p) => p.id === s.activePageId);
          const e = page?.elements.find((x) => x.id === id);
          if (!page || !e) return;
          if (bebas) {
            e.panelId = null;
            return;
          }
          const tujuan = panelDiTitik(page.panels, { x: e.x + e.w / 2, y: e.y + e.h / 2 });
          if (tujuan) e.panelId = tujuan.id;
        }),

      updateElement: (id, patch) =>
        set((s) => {
          for (const page of s.pages) {
            const e = page.elements.find((x) => x.id === id);
            if (e) Object.assign(e, patch);
          }
        }),

      deleteElement: (id) =>
        set((s) => {
          for (const page of s.pages) page.elements = page.elements.filter((e) => e.id !== id);
          if (s.selectedId === id) s.selectedId = null;
        }),

      duplicateElement: (id) =>
        set((s) => {
          const page = s.pages.find((p) => p.id === s.activePageId);
          const baru = page && duplicateElement(page, id);
          if (baru) s.selectedId = baru;
        }),

      setCornerEdit: (panelId) =>
        set((s) => {
          s.cornerEdit = panelId;
          if (panelId) s.selectedLayer = "panel";
        }),

      selectImage: (panelId) =>
        set((s) => {
          s.selectedId = panelId;
          s.selectedLayer = "gambar";
          s.cornerEdit = null;
        }),

      setImageRect: (panelId, rect) =>
        set((s) => {
          const page = s.pages.find((p) => p.id === s.activePageId);
          if (page) setImageRect(page, panelId, rect);
        }),

      setLatar: (panelId, latar) =>
        set((s) => {
          const page = s.pages.find((p) => p.id === s.activePageId);
          if (page) setLatar(page, panelId, latar);
        }),

      setCorner: (panelId, index, pt) =>
        set((s) => {
          const page = s.pages.find((p) => p.id === s.activePageId);
          if (page) setCorner(page, panelId, index, pt);
        }),

      resetCorners: (panelId) =>
        set((s) => {
          const page = s.pages.find((p) => p.id === s.activePageId);
          if (page) resetCorners(page, panelId);
        }),

      movePanel: (id, dx, dy) =>
        set((s) => {
          const page = s.pages.find((p) => p.id === s.activePageId);
          if (page) movePanel(page, id, dx, dy);
          s.drag = null;
        }),

      resizePanel: (id, rect) =>
        set((s) => {
          const page = s.pages.find((p) => p.id === s.activePageId);
          if (page) resizePanel(page, id, rect);
        }),

      splitPanel: (id, arah) =>
        set((s) => {
          const page = s.pages.find((p) => p.id === s.activePageId);
          if (page) splitPanel(page, id, arah);
        }),

      duplicatePanel: (id) =>
        set((s) => {
          const page = s.pages.find((p) => p.id === s.activePageId);
          const baru = page && duplicatePanel(page, id);
          if (baru) s.selectedId = baru;
        }),

      deletePanel: (id) =>
        set((s) => {
          const page = s.pages.find((p) => p.id === s.activePageId);
          if (page && deletePanel(page, id) && s.selectedId === id) s.selectedId = null;
        }),

      isiPanelKosong: (pageId, hasil) =>
        set((s) => {
          const page = s.pages.find((p) => p.id === pageId);
          if (!page) return;
          for (const h of hasil) {
            const panel = page.panels.find((p) => p.id === h.id);
            if (!panel || panel.adegan.trim()) continue; // panel yang sudah berisi tidak ditimpa
            panel.adegan = h.adegan;
            page.bubbles.push(...layoutBubbles({ ...panel }, h.dialog));
          }
        }),

      gantiNamaTokoh: (ganti) =>
        set((s) => {
          for (const page of s.pages) {
            for (const p of page.panels) p.adegan = gantiNamaDiTeks(p.adegan, ganti);
            for (const b of page.bubbles) b.text = gantiNamaDiTeks(b.text, ganti);
          }
        }),

      updatePanel: (id, patch) =>
        set((s) => {
          for (const page of s.pages) {
            const p = page.panels.find((x) => x.id === id);
            if (p) Object.assign(p, patch);
          }
        }),
    })),
    {
      limit: 100,
      // hanya data komik yang masuk riwayat; seleksi, alat, dan zoom tidak
      partialize: (s) => ({ pages: s.pages }),
      // catat hanya bila data halaman berubah; immer menjaga referensi yang sama bila tidak ada perubahan
      equality: (a, b) => a.pages === b.pages,
    },
  ),
);

/**
 * Pasang URL gambar hasil generate ke panel. Gambar ditulis server, jadi tidak boleh hilang saat undo:
 * perubahan tidak dicatat sebagai langkah baru, dan semua snapshot riwayat ikut diperbarui.
 */
export function applyPanelImages(images: Record<string, string>) {
  const patch = (pages: EditorPage[]) =>
    pages.map((pg) =>
      pg.panels.some((p) => images[p.id])
        ? { ...pg, panels: pg.panels.map((p) => (images[p.id] ? { ...p, imageUrl: images[p.id], imageRect: null } : p)) }
        : pg,
    );
  const t = useEditor.temporal.getState();
  t.pause();
  useEditor.setState((s) => ({ pages: patch(s.pages) }));
  t.resume();
  useEditor.temporal.setState({
    pastStates: t.pastStates.map((st) => (st.pages ? { ...st, pages: patch(st.pages) } : st)),
    futureStates: t.futureStates.map((st) => (st.pages ? { ...st, pages: patch(st.pages) } : st)),
  });
}

export const undo = () => useEditor.temporal.getState().undo();
export const redo = () => useEditor.temporal.getState().redo();
export const clearHistory = () => useEditor.temporal.getState().clear();

/** Balon yang sedang dipilih (null bila tidak ada atau sudah terhapus lewat undo). */
export function selectSelectedBubble(s: Pick<EditorState, "pages" | "activePageId" | "selectedId">) {
  const page = s.pages.find((p) => p.id === s.activePageId);
  return page?.bubbles.find((b) => b.id === s.selectedId) ?? null;
}

/** Panel yang sedang dipilih (null bila tidak ada). */
export function selectSelectedPanel(s: Pick<EditorState, "pages" | "activePageId" | "selectedId">) {
  const page = s.pages.find((p) => p.id === s.activePageId);
  return page?.panels.find((p) => p.id === s.selectedId) ?? null;
}

/** Elemen matematika yang sedang dipilih (null bila tidak ada). */
export function selectSelectedElement(s: Pick<EditorState, "pages" | "activePageId" | "selectedId">) {
  const page = s.pages.find((p) => p.id === s.activePageId);
  return page?.elements.find((e) => e.id === s.selectedId) ?? null;
}

/** Balon yang sedang dipilih bersama: daftar `seleksi` bila ada minimal dua dan memuat balon utama (selectedId), kalau tidak kosong. */
export function seleksiAktif(seleksi: string[], selectedId: string | null): string[] {
  return seleksi.length >= 2 && selectedId !== null && seleksi.includes(selectedId) ? seleksi : [];
}
