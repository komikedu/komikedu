import { describe, expect, it } from "vitest";
import { TOKOH_PRESET, fromPreset, sheetCocok } from "./tokoh";

describe("sheetCocok", () => {
  const sari = fromPreset(TOKOH_PRESET.find((t) => t.id === "sari")!);
  const doni = fromPreset(TOKOH_PRESET.find((t) => t.id === "doni")!);
  const sheet = [sari, doni, { nama: "Pak Satpam", deskripsi: "pria berseragam biru" }].map(({ nama, deskripsi }) => ({ nama, deskripsi }));

  it("cocok bila semua tokoh pilihan ada dengan deskripsi sama (tokoh tambahan di lembar boleh)", () => {
    expect(sheetCocok(sheet, [sari, doni])).toBe(true);
    expect(sheetCocok(sheet, [])).toBe(true);
  });

  it("tidak cocok bila tokoh baru ditambahkan atau deskripsinya diubah", () => {
    const kiki = fromPreset(TOKOH_PRESET.find((t) => t.id === "kiki")!);
    expect(sheetCocok(sheet, [sari, kiki])).toBe(false);
    expect(sheetCocok(sheet, [{ ...sari, deskripsi: "anak perempuan berambut pendek" }])).toBe(false);
  });
});

describe("ganti nama tokoh", () => {
  const ganti = [{ lama: "Doni", baru: "Bima" }];

  it("mengganti kata utuh tanpa peduli huruf besar-kecil", async () => {
    const { gantiNamaDiTeks } = await import("./tokoh");
    expect(gantiNamaDiTeks("Doni dan doni. DONI!", ganti)).toBe("Bima dan Bima. Bima!");
    expect(gantiNamaDiTeks("Doniyah dan Ardoni tetap", ganti)).toBe("Doniyah dan Ardoni tetap");
    expect(gantiNamaDiTeks("Bu Rina mengajar", [{ lama: "Bu Rina", baru: "Pak Budi" }])).toBe("Pak Budi mengajar");
    expect(gantiNamaDiTeks("a.b (c)", [{ lama: "a.b", baru: "x" }])).toBe("x (c)");
  });

  it("mengganti nama di script panel naskah", async () => {
    const { gantiNamaDiScript } = await import("./tokoh");
    const sp = { adegan: "Doni melihat Sari", karakter: ["Doni", "Sari"], dialog: [{ karakter: "doni", teks: "Halo, aku Doni" }], hitungan: [] };
    expect(gantiNamaDiScript(sp, ganti)).toEqual({
      adegan: "Bima melihat Sari",
      karakter: ["Bima", "Sari"],
      dialog: [{ karakter: "Bima", teks: "Halo, aku Bima" }],
      hitungan: [],
    });
  });

  it("store mengganti nama di balon dan adegan dalam satu langkah undo", async () => {
    const { createPage } = await import("@/lib/editor/factory");
    const { clearHistory, undo, useEditor } = await import("@/lib/editor/store");
    const page = createPage("1-penuh");
    page.panels[0].adegan = "Doni berlari";
    useEditor.getState().init([page]);
    useEditor.getState().addBubble(page.panels[0].id, "bicara", 300, 300);
    const bid = useEditor.getState().pages[0].bubbles[0].id;
    useEditor.getState().updateBubble(bid, { text: "Ayo, Doni!" });
    clearHistory();
    useEditor.getState().gantiNamaTokoh(ganti);
    const pg = () => useEditor.getState().pages[0];
    expect(pg().panels[0].adegan).toBe("Bima berlari");
    expect(pg().bubbles[0].text).toBe("Ayo, Bima!");
    undo();
    expect(pg().panels[0].adegan).toBe("Doni berlari");
    expect(pg().bubbles[0].text).toBe("Ayo, Doni!");
  });
});

describe("tambahTokohDariSheet", () => {
  it("menambah tokoh naskah yang belum ada, memakai preset bila namanya sama, dan sheet tetap cocok", async () => {
    const { tambahTokohDariSheet, sheetCocok, fromPreset, TOKOH_PRESET } = await import("./tokoh");
    const joko = { id: "sendiri-1", nama: "Joko", peran: "", deskripsi: "anak laki-laki berkaos hijau", preset: false };
    const sheet = [
      { nama: "Joko", deskripsi: "anak laki-laki berkaos hijau" },
      { nama: "Siti", deskripsi: "anak perempuan rambut dikuncir" },
      { nama: "bu rina", deskripsi: "guru versi AI" },
    ];
    const r = tambahTokohDariSheet([joko], sheet);
    expect(r.tokoh.map((t) => t.nama)).toEqual(["Joko", "Siti", "Bu Rina"]);
    expect(r.tokoh[1]).toMatchObject({ preset: false, deskripsi: "anak perempuan rambut dikuncir" });
    expect(r.tokoh[2]).toEqual(fromPreset(TOKOH_PRESET.find((p) => p.id === "bu-rina")!));
    expect(sheetCocok(r.sheet, r.tokoh)).toBe(true);
  });

  it("tidak melebihi batas tokoh", async () => {
    const { tambahTokohDariSheet, MAX_TOKOH } = await import("./tokoh");
    const sheet = Array.from({ length: 12 }, (_, i) => ({ nama: `Tokoh${i}`, deskripsi: "anak" }));
    expect(tambahTokohDariSheet([], sheet).tokoh).toHaveLength(MAX_TOKOH);
  });
});
