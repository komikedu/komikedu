import { beforeEach, describe, expect, it } from "vitest";
import { createPage } from "./factory";
import { PAGE_H, PAGE_W } from "./types";
import { clearHistory, redo, selectSelectedBubble, undo, useEditor } from "./store";

const state = () => useEditor.getState();
const page = () => state().pages.find((p) => p.id === state().activePageId)!;

beforeEach(() => {
  state().init([createPage("3-satu-atas-dua-bawah")]);
  clearHistory();
});

describe("createPage", () => {
  it("mengubah koordinat template ke unit kanvas dan semua panel berada di dalam halaman", () => {
    for (const panel of page().panels) {
      expect(panel.x).toBeGreaterThanOrEqual(0);
      expect(panel.y).toBeGreaterThanOrEqual(0);
      expect(panel.x + panel.w).toBeLessThanOrEqual(PAGE_W);
      expect(panel.y + panel.h).toBeLessThanOrEqual(PAGE_H);
    }
    expect(page().panels).toHaveLength(3);
  });
});

describe("balon", () => {
  it("menambah balon, memilihnya, dan kembali ke alat move", () => {
    state().setTool("text");
    const panel = page().panels[0];
    state().addBubble(panel.id, "bicara", panel.x + 100, panel.y + 100);
    expect(page().bubbles).toHaveLength(1);
    expect(state().selectedId).toBe(page().bubbles[0].id);
    expect(state().tool).toBe("move");
  });

  it("menjepit balon baru di tepi halaman agar tidak keluar kanvas", () => {
    state().addBubble(page().panels[0].id, "bicara", -500, 99999);
    const b = page().bubbles[0];
    expect(b.x).toBe(0);
    expect(b.y + b.h).toBeLessThanOrEqual(PAGE_H);
  });

  it("menolak balon untuk panel yang tidak ada di halaman aktif", () => {
    state().addBubble("panel-tidak-ada", "bicara", 10, 10);
    expect(page().bubbles).toHaveLength(0);
  });

  it("mengubah dan menghapus balon", () => {
    state().addBubble(page().panels[0].id, "bicara", 200, 100);
    const id = page().bubbles[0].id;
    state().updateBubble(id, { text: "Halo", fontSize: 30 });
    expect(selectSelectedBubble(state())?.text).toBe("Halo");
    state().deleteBubble(id);
    expect(page().bubbles).toHaveLength(0);
    expect(state().selectedId).toBeNull();
  });

  it("narasi tidak punya ekor", () => {
    state().addBubble(page().panels[0].id, "narasi", 200, 100);
    expect(page().bubbles[0].tail).toBeNull();
  });
});

describe("undo/redo", () => {
  it("membatalkan dan mengulang perubahan teks", () => {
    state().addBubble(page().panels[0].id, "bicara", 200, 100);
    const id = page().bubbles[0].id;
    state().updateBubble(id, { text: "Satu" });
    state().updateBubble(id, { text: "Dua" });

    undo();
    expect(page().bubbles[0].text).toBe("Satu");
    redo();
    expect(page().bubbles[0].text).toBe("Dua");
  });

  it("undo menambah balon menghilangkan balon, dan seleksi tidak menunjuk balon yang hilang", () => {
    state().addBubble(page().panels[0].id, "bicara", 200, 100);
    undo();
    expect(page().bubbles).toHaveLength(0);
    expect(selectSelectedBubble(state())).toBeNull();
  });

  it("seleksi dan zoom tidak masuk riwayat", () => {
    state().addBubble(page().panels[0].id, "bicara", 200, 100);
    const before = useEditor.temporal.getState().pastStates.length;
    state().select(null);
    state().setZoom(2);
    expect(useEditor.temporal.getState().pastStates.length).toBe(before);
  });
});

describe("halaman", () => {
  it("menambah halaman dan mengaktifkannya", () => {
    state().addPage("4-grid");
    expect(state().pages).toHaveLength(2);
    expect(page().panels).toHaveLength(4);
  });

  it("zoom dibatasi 0.25 sampai 3", () => {
    state().setZoom(100);
    expect(state().zoom).toBe(3);
    state().setZoom(0);
    expect(state().zoom).toBe(0.25);
  });
});
