import { describe, expect, it } from "vitest";
import { LAYOUTS, layoutForPanelCount } from "./layouts";
import { aturanPanelPerHalaman } from "./panel-prompt";
import { AIScriptSchema } from "./schemas";

describe("aturanPanelPerHalaman", () => {
  it("otomatis bila kosong atau tidak valid: 2 sampai 4 panel", () => {
    for (const n of [null, undefined, 0, 7, 2.5]) expect(aturanPanelPerHalaman(n)).toMatch(/2 sampai 4 panel/);
  });

  it("jumlah tertentu diminta tepat, satu panel diminta penuh", () => {
    expect(aturanPanelPerHalaman(3)).toMatch(/TEPAT 3 panel/);
    expect(aturanPanelPerHalaman(6)).toMatch(/TEPAT 6 panel/);
    expect(aturanPanelPerHalaman(1)).toMatch(/TEPAT 1 panel penuh/);
  });
});

describe("rentang panel per halaman", () => {
  it("batas bawah dan atas membentuk rentang yang boleh berbeda tiap halaman", () => {
    const r = aturanPanelPerHalaman(2, 6);
    expect(r).toMatch(/antara 2 dan 6 panel/);
    expect(r).toMatch(/boleh berbeda tiap halaman/);
    expect(r).not.toMatch(/TEPAT/);
  });
  it("rentang tidak valid jatuh ke jumlah tetap atau otomatis", () => {
    expect(aturanPanelPerHalaman(3, 3)).toMatch(/TEPAT 3 panel/);
    expect(aturanPanelPerHalaman(4, 2)).toMatch(/TEPAT 4 panel/);
    expect(aturanPanelPerHalaman(3, 9)).toMatch(/TEPAT 3 panel/);
    expect(aturanPanelPerHalaman(null, 5)).toMatch(/2 sampai 4 panel/);
  });
});

describe("panel per halaman sampai 6", () => {
  it("setiap jumlah 1 sampai 6 punya template layout", () => {
    for (let n = 1; n <= 6; n++) expect(layoutForPanelCount(n).panels).toHaveLength(n);
    expect(Math.max(...LAYOUTS.map((l) => l.panels.length))).toBe(6);
  });

  it("naskah AI menerima 6 panel per halaman dan menolak 7", () => {
    const panel = { urutan: 1, adegan: "a", karakter: [], dialog: [], hitungan: [] };
    const halaman = (n: number) => ({ halaman: [{ urutan: 1, panel: Array.from({ length: n }, (_, i) => ({ ...panel, urutan: i + 1 })) }] });
    expect(AIScriptSchema.safeParse(halaman(6)).success).toBe(true);
    expect(AIScriptSchema.safeParse(halaman(7)).success).toBe(false);
  });
});
