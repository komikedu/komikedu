import { describe, expect, it } from "vitest";
import { buatNaskahFlow } from "@/lib/comics/naskah-flow";
import { NaskahEditSchema, MAX_NASKAH_PAGES } from "@/lib/comics/naskah-edit";
import { buatPromptFlow } from "@/lib/comics/prompt-flow";
import { DraftSchema } from "@/lib/comics/schema";
import { judulSampul, scriptToPages } from "@/lib/editor/from-script";
import { buildPagePrompt, buildPanelPrompt } from "./page-prompt";
import { ComicInputSchema, OutlineSchema, type Script } from "./schemas";
import { komposisiSampul, tambahSampul } from "./sampul";
import { checkScript } from "./check";

const isi: Script = {
  halaman: [
    { urutan: 1, panel: [{ urutan: 1, adegan: "Kelas pagi", karakter: ["Doni"], dialog: [{ karakter: "Doni", jenis: "bicara", teks: "Halo!" }], hitungan: [] }] },
    { urutan: 2, panel: [{ urutan: 1, adegan: "Pasar ramai", karakter: [], dialog: [], hitungan: [] }] },
  ],
};
const tokoh = [{ nama: "Doni", peran: "murid", deskripsi: "berkacamata" }];

describe("tambahSampul", () => {
  const s = tambahSampul(isi, { judul: "Petualangan KPK", sampul: { adegan: "  Doni  melompat\n gembira di taman " } }, { topik: "KPK", tokoh });

  it("sampul menjadi halaman 1, satu panel penuh tanpa dialog, halaman isi bergeser satu nomor", () => {
    expect(s.halaman.map((h) => h.urutan)).toEqual([1, 2, 3]);
    expect(s.halaman[0]).toMatchObject({ sampul: true, layout: "1-penuh" });
    expect(s.halaman[0].panel).toHaveLength(1);
    expect(s.halaman[0].panel[0].dialog).toEqual([]);
    expect(s.halaman[1].panel[0].adegan).toBe("Kelas pagi");
    expect(s.halaman[2].panel[0].adegan).toBe("Pasar ramai");
    expect(s.halaman.slice(1).every((h) => !h.sampul)).toBe(true);
  });
  it("adegan sampul dirapikan dan memuat tokoh utama", () => {
    expect(s.halaman[0].panel[0].adegan).toBe("Doni melompat gembira di taman");
    expect(s.halaman[0].panel[0].karakter).toEqual(["Doni"]);
  });
  it("tanpa adegan dari AI dipakai adegan bawaan yang menyebut judul dan topik", () => {
    const b = tambahSampul(isi, { judul: "Petualangan KPK" }, { topik: "KPK", tokoh: [] });
    expect(b.halaman[0].panel[0].adegan).toContain("Petualangan KPK");
    expect(b.halaman[0].panel[0].adegan).toContain("KPK");
    expect(b.halaman[0].panel[0].karakter).toEqual([]);
  });
  it("urutan halaman isi yang tidak berurutan tetap benar dan naskah asli tidak berubah", () => {
    const acak: Script = { halaman: [isi.halaman[1], isi.halaman[0]] };
    const b = tambahSampul(acak, { judul: "J" }, { topik: "T" });
    expect(b.halaman.map((h) => [h.urutan, h.panel[0].adegan])).toEqual([[1, expect.any(String)], [2, "Kelas pagi"], [3, "Pasar ramai"]]);
    expect(isi.halaman.map((h) => h.urutan)).toEqual([1, 2]);
  });
  it("sampul tidak menimbulkan tanda cek naskah", () => {
    expect(checkScript(s).filter((f) => f.halaman === 1)).toEqual([]);
  });
  it("lolos validasi naskah, termasuk batas 12 halaman isi ditambah sampul", () => {
    expect(NaskahEditSchema.safeParse(s).success).toBe(true);
    const dua = (n: number) => ({ halaman: Array.from({ length: n }, (_, i) => ({ ...isi.halaman[0], urutan: i + 1 })) });
    expect(NaskahEditSchema.safeParse(dua(MAX_NASKAH_PAGES)).success).toBe(true);
    expect(NaskahEditSchema.safeParse(dua(MAX_NASKAH_PAGES + 1)).success).toBe(false);
  });
});

describe("skema", () => {
  it("input komik, outline, dan draft mengenal pilihan sampul", () => {
    expect(ComicInputSchema.parse({ topik: "x", jenjang: 3, jumlahHalaman: 4, denganSampul: true }).denganSampul).toBe(true);
    expect(ComicInputSchema.parse({ topik: "x", jenjang: 3, jumlahHalaman: 4 }).denganSampul).toBeUndefined();
    expect(OutlineSchema.parse({ judul: "J", sampul: { adegan: "a" }, halaman: [] }).sampul?.adegan).toBe("a");
    expect(OutlineSchema.parse({ judul: "J", halaman: [] }).sampul).toBeUndefined();
    const draft = { judul: "J", topik: null, jenjang: 3, tujuan: null, jumlah_halaman: 6, dengan_sampul: true, halaman_otomatis: false, sumber: "topik", tema: null, bahasa: "indonesia", panel_per_halaman: null, panel_per_halaman_maks: null, gaya: null, lebar_halaman: 900, tinggi_halaman: 1200, cerita: null, tokoh_json: [], wizard_step: 1 };
    expect(DraftSchema.safeParse(draft).success).toBe(true);
    expect(DraftSchema.safeParse({ ...draft, dengan_sampul: "ya" }).success).toBe(false);
  });
});

describe("prompt sampul", () => {
  it("komposisi sampul mengosongkan bagian atas untuk judul dan melarang balon", () => {
    const k = komposisiSampul();
    expect(k).toContain("SAMPUL");
    expect(k).toContain("ATAS");
    expect(k).toContain("judul");
    expect(k).toContain("Tanpa balon");
  });
  it("prompt Flow sampul berbeda dari panel cerita: poster, ruang judul, tanpa ruang balon", () => {
    const biasa = buatPromptFlow({ adegan: "Doni di kelas", gaya: "kartun", tokoh: [], rasio: "3:4", balon: 1 });
    const sampul = buatPromptFlow({ adegan: "Doni melompat", gaya: "kartun", tokoh: [], rasio: "3:4", sampul: true });
    expect(sampul).toContain("SAMPUL");
    expect(sampul).toContain("Isi sampul: Doni melompat");
    expect(sampul).toContain("judul");
    expect(sampul).not.toContain("ruang untuk balon dialog");
    expect(biasa).not.toContain("SAMPUL");
    expect(biasa).toContain("ruang untuk balon dialog");
    expect(sampul).toContain("jangan gambar teks");
  });
  it("prompt halaman dan prompt per panel untuk gambar AI ikut menyesuaikan", () => {
    const req = { gaya: "kartun", karakter: [], panels: [{ adegan: "Doni melompat", karakter: [], rect: { x: 0, y: 0, w: 1, h: 1 }, balon: 0, sampul: true }] };
    expect(buildPagePrompt(req)).toContain("SAMPUL");
    expect(buildPanelPrompt(req.panels[0], req)).toContain("Isi sampul: Doni melompat");
    expect(buildPanelPrompt({ ...req.panels[0], sampul: false, balon: 1 }, req)).not.toContain("SAMPUL");
  });
});

describe("JSON Flow", () => {
  const n = tambahSampul(isi, { judul: "Judul" }, { topik: "KPK", tokoh });
  const j = buatNaskahFlow({ judul: "Judul", gaya: "faceless", tokoh: [], naskah: n });
  it("panel sampul ditandai dan promptnya prompt sampul; nama berkas tetap 1-1", () => {
    expect(j.panel[0]).toMatchObject({ halaman: 1, panel: 1, sampul: true, nama_berkas: "1-1" });
    expect(j.panel[0].prompt).toContain("SAMPUL");
    expect(j.panel[1].sampul).toBeUndefined();
    expect(j.panel[1].prompt).not.toContain("SAMPUL");
  });
});

describe("sampul di editor", () => {
  const n = tambahSampul(isi, { judul: "Reno dan Reni: Belajar Jam" }, { topik: "Jam", tokoh });
  const { pages, panelScripts } = scriptToPages(n, { w: 900, h: 1200 }, "Reno dan Reni: Belajar Jam");

  it("halaman pertama sampul punya judul bergaya bebas di atas, halaman lain tidak", () => {
    expect(pages[0].panels).toHaveLength(1);
    const judul = pages[0].elements;
    expect(judul).toHaveLength(1);
    expect(judul[0]).toMatchObject({ kind: "teks", gaya: "judul-kuning", text: "Reno dan Reni: Belajar Jam", panelId: null });
    expect(judul[0].y + judul[0].h).toBeLessThanOrEqual(1200 * 0.3);
    expect(pages.slice(1).every((p) => p.elements.length === 0)).toBe(true);
  });
  it("skrip panel sampul ditandai agar gambarnya memakai prompt sampul", () => {
    expect(panelScripts.get(pages[0].panels[0].id)?.sampul).toBe(true);
    expect(panelScripts.get(pages[1].panels[0].id)?.sampul).toBeUndefined();
  });
  it("tanpa sampul tidak ada judul otomatis, dan judul kosong tidak membuat elemen", () => {
    expect(scriptToPages(isi, { w: 900, h: 1200 }, "Judul").pages.every((p) => p.elements.length === 0)).toBe(true);
    expect(scriptToPages(n, { w: 900, h: 1200 }, "  ").pages[0].elements).toHaveLength(0);
  });
  it("judul panjang dipotong dan hurufnya mengecil agar muat", () => {
    const pendek = judulSampul("KPK", { w: 900, h: 1200 });
    const panjang = judulSampul("Petualangan Seru Reno dan Reni Menaklukkan Misteri Jam Dinding di Sekolah Dasar Negeri", { w: 900, h: 1200 });
    expect(panjang.text.length).toBeLessThanOrEqual(80);
    expect(panjang.fontSize).toBeLessThan(pendek.fontSize);
    expect(panjang.fontSize).toBeGreaterThanOrEqual(40);
    expect(judulSampul("x".repeat(200), { w: 900, h: 1200 }).text).toHaveLength(80);
  });
  it("mengikuti ukuran halaman lain", () => {
    const e = judulSampul("Judul", { w: 1200, h: 900 });
    expect(e.x + e.w).toBeLessThanOrEqual(1200);
    expect(e.y + e.h).toBeLessThanOrEqual(900 * 0.3);
  });
});
