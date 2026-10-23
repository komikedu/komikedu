import { describe, expect, it } from "vitest";
import { LAYOUTS, layoutForPanelCount, type Rect } from "./layouts";

const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w - 1e-9 && b.x < a.x + a.w - 1e-9 && a.y < b.y + b.h - 1e-9 && b.y < a.y + a.h - 1e-9;

describe("LAYOUTS", () => {
  it("id unik", () => {
    expect(new Set(LAYOUTS.map((l) => l.id)).size).toBe(LAYOUTS.length);
  });

  it.each(LAYOUTS.map((l) => [l.id, l] as const))("%s: semua panel di dalam halaman dan tidak bertumpuk", (_id, l) => {
    for (const p of l.panels) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.x + p.w).toBeLessThanOrEqual(1 + 1e-9);
      expect(p.y + p.h).toBeLessThanOrEqual(1 + 1e-9);
    }
    for (let i = 0; i < l.panels.length; i++) {
      for (let j = i + 1; j < l.panels.length; j++) expect(overlap(l.panels[i], l.panels[j])).toBe(false);
    }
  });

  it.each(LAYOUTS.map((l) => [l.id, l] as const))("%s: urutan panel = urutan baca (atas dulu, lalu kiri)", (_id, l) => {
    for (let i = 1; i < l.panels.length; i++) {
      const a = l.panels[i - 1];
      const b = l.panels[i];
      expect(b.y > a.y + 1e-9 || (Math.abs(b.y - a.y) < 1e-9 && b.x > a.x)).toBe(true);
    }
  });

  it("ada layout untuk 1 sampai 4 panel, default tetap sama", () => {
    expect(layoutForPanelCount(1).id).toBe("1-penuh");
    expect(layoutForPanelCount(2).id).toBe("2-atas-bawah");
    expect(layoutForPanelCount(3).id).toBe("3-satu-atas-dua-bawah");
    expect(layoutForPanelCount(4).id).toBe("4-grid");
  });
});
