import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { temporal } from "zundo";
import { createBubble, createPage } from "./factory";
import { deletePanel, duplicateBubble, duplicatePanel, movePanel, resizePanel, splitPanel, type SplitArah } from "./panel-ops";
import type { Bubble, BubbleKind, EditorPage, Panel } from "./types";

type Tool = "move" | "text";

type EditorState = {
  pages: EditorPage[];
  activePageId: string;
  selectedId: string | null;
  tool: Tool;
  zoom: number;
  /** Pergeseran sementara saat panel diseret (agar balonnya ikut terlihat bergerak); tidak masuk riwayat. */
  drag: { panelId: string; dx: number; dy: number } | null;

  init: (pages: EditorPage[]) => void;
  setActivePage: (id: string) => void;
  select: (id: string | null) => void;
  setTool: (tool: Tool) => void;
  setZoom: (zoom: number) => void;
  addPage: (layoutId: string) => void;
  addBubble: (panelId: string, kind: BubbleKind, cx: number, cy: number) => void;
  updateBubble: (id: string, patch: Partial<Omit<Bubble, "id" | "panelId">>) => void;
  deleteBubble: (id: string) => void;
  duplicateBubble: (id: string) => void;
  setDrag: (drag: EditorState["drag"]) => void;
  movePanel: (id: string, dx: number, dy: number) => void;
  resizePanel: (id: string, rect: { x: number; y: number; w: number; h: number }) => void;
  splitPanel: (id: string, arah: SplitArah) => void;
  duplicatePanel: (id: string) => void;
  deletePanel: (id: string) => void;
  updatePanel: (id: string, patch: Partial<Pick<Panel, "visible">>) => void;
};

export const useEditor = create<EditorState>()(
  temporal(
    immer((set) => ({
      pages: [],
      activePageId: "",
      selectedId: null,
      tool: "move",
      zoom: 1,
      drag: null,

      init: (pages) =>
        set((s) => {
          s.pages = pages;
          s.activePageId = pages[0]?.id ?? "";
          s.selectedId = null;
        }),
      setActivePage: (id) =>
        set((s) => {
          s.activePageId = id;
          s.selectedId = null;
        }),
      select: (id) =>
        set((s) => {
          s.selectedId = id;
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
