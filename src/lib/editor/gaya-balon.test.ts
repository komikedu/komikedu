import { describe, expect, it } from "vitest";
import { createBubble, createPage } from "./factory";
import { FONT_BALON, gayaHuruf, gayaTerpakai, modeBalon, susunVertikal } from "./gaya-balon";
import { EditorPayloadSchema, fromNested, toRows, type NestedPage } from "./persist";

const balon = (kind: "bicara" | "pikir" | "narasi" = "bicara") => createBubble("11111111-1111-4111-8111-111111111111", kind, 300, 300);

describe("gaya balon", () => {
  it("bawaan: balon putih bergaris 4 untuk bicara, kotak kuning untuk narasi", () => {
    expect(modeBalon(balon())).toBe("balon");
    expect(modeBalon(balon("narasi"))).toBe("kotak");
    expect(gayaTerpakai(balon())).toMatchObject({ mode: "balon", font: "comic", tebal: true, miring: false, rata: "center", vertikal: false, warnaTeks: "#111111", warnaLatar: "#ffffff", tebalGaris: 4, warnaGaris: "#111111", rotasi: 0 });
    expect(gayaTerpakai(balon("narasi")).warnaLatar).toBe("#fff6c8");
  });
  it("pilihan guru mengalahkan bawaan", () => {
    const b = { ...balon(), gaya: { mode: "teks" as const, warnaLatar: "#abcdef", tebalGaris: 0, miring: true, tebal: false } };
    expect(gayaTerpakai(b)).toMatchObject({ mode: "teks", warnaLatar: "#abcdef", tebalGaris: 0, miring: true, tebal: false });
  });
  it("gaya huruf Konva dari tebal dan miring", () => {
    expect(gayaHuruf(true, false)).toBe("bold");
    expect(gayaHuruf(false, true)).toBe("italic");
    expect(gayaHuruf(true, true)).toBe("italic bold");
    expect(gayaHuruf(false, false)).toBe("normal");
  });
  it("teks vertikal: satu huruf per baris, baris asli dipisah baris kosong", () => {
    expect(susunVertikal("ABC")).toBe("A\nB\nC");
    expect(susunVertikal("AB\nCD")).toBe("A\nB\n\nC\nD");
    expect(susunVertikal("")).toBe("");
  });
  it("daftar font punya id unik dan font bawaan", () => {
    expect(new Set(FONT_BALON.map((f) => f.id)).size).toBe(FONT_BALON.length);
    expect(FONT_BALON.some((f) => f.id === "comic")).toBe(true);
  });
});

describe("gaya balon tersimpan", () => {
  const halaman = () => {
    const p = createPage("1-penuh");
    p.bubbles.push({ ...createBubble(p.panels[0].id, "bicara", 300, 300), bentuk: "kotak", gaya: { mode: "balon", font: "bangers", miring: true, rata: "left", vertikal: false, warnaTeks: "#112233", warnaLatar: "#ffeeaa", tebalGaris: 7, warnaGaris: "#445566", rotasi: -12 } });
    return p;
  };
  it("lolos validasi, tersimpan di kolom ukuran, dan dimuat utuh", () => {
    const p = halaman();
    const parsed = EditorPayloadSchema.safeParse(JSON.parse(JSON.stringify([p])));
    expect(parsed.success).toBe(true);
    const rows = toRows("c", parsed.success ? parsed.data : []);
    expect(rows.bubbles[0].ukuran.gaya).toMatchObject({ font: "bangers", tebalGaris: 7, rotasi: -12 });
    const nested: NestedPage[] = [{ id: p.id, urutan: 1, template_layout: p.layoutId, panels: [{ id: rows.panels[0].id, urutan: 1, script_json: null, image_url: null, posisi: rows.panels[0].posisi, tampil: true, adegan: "", math_elements_json: [], bubbles: rows.bubbles.map((b) => ({ id: b.id, jenis: b.jenis, teks: b.teks, posisi: b.posisi, ukuran: b.ukuran, ekor: b.ekor, font_size: b.font_size, tampil: b.tampil, urutan: b.urutan })) }] }];
    expect(fromNested(nested)[0].bubbles[0].gaya).toMatchObject({ warnaTeks: "#112233", warnaLatar: "#ffeeaa", rata: "left", miring: true });
  });
  it("menolak warna dan nilai yang tidak valid", () => {
    const p = halaman();
    const rusak = (gaya: object) => EditorPayloadSchema.safeParse([{ ...p, bubbles: [{ ...p.bubbles[0], gaya }] }]).success;
    expect(rusak({ warnaTeks: "merah" })).toBe(false);
    expect(rusak({ tebalGaris: 99 })).toBe(false);
    expect(rusak({ mode: "lain" })).toBe(false);
    expect(rusak({ rata: "justify" })).toBe(false);
  });
  it("gaya rusak dari database dibuang tanpa menggagalkan pemuatan", () => {
    const nested: NestedPage[] = [{ id: "a", urutan: 1, template_layout: null, panels: [{ id: "p", urutan: 1, script_json: null, image_url: null, posisi: null, tampil: true, adegan: "", bubbles: [{ id: "b", jenis: "bicara", teks: "x", posisi: { x: 0, y: 0 }, ukuran: { w: 100, h: 50, gaya: { warnaTeks: "bukan-warna" } }, ekor: null, font_size: 20, tampil: true, urutan: 0 }] }] }];
    expect(fromNested(nested)[0].bubbles[0].gaya).toBeUndefined();
  });
});

describe("stroke pada huruf balon", () => {
  const dasar = () => createBubble("11111111-1111-4111-8111-111111111111", "bicara", 300, 300);
  it("bawaan mati dengan tebal 5 dan warna putih", () => {
    expect(gayaTerpakai(dasar())).toMatchObject({ stroke: false, tebalStroke: 5, warnaStroke: "#ffffff" });
  });
  it("pilihan guru dipakai dan lolos validasi; nilai di luar batas ditolak", () => {
    const p = createPage("1-penuh");
    const b = { ...createBubble(p.panels[0].id, "bicara", 300, 300), gaya: { stroke: true, tebalStroke: 8, warnaStroke: "#112233" } };
    expect(gayaTerpakai(b)).toMatchObject({ stroke: true, tebalStroke: 8, warnaStroke: "#112233" });
    expect(EditorPayloadSchema.safeParse(JSON.parse(JSON.stringify([{ ...p, bubbles: [b] }]))).success).toBe(true);
    expect(EditorPayloadSchema.safeParse([{ ...p, bubbles: [{ ...b, gaya: { tebalStroke: 99 } }] }]).success).toBe(false);
    expect(EditorPayloadSchema.safeParse([{ ...p, bubbles: [{ ...b, gaya: { warnaStroke: "putih" } }] }]).success).toBe(false);
  });
});

describe("sudut membulat kotak", () => {
  it("bawaan 4, pilihan guru dipakai, dan di luar batas ditolak", () => {
    const p = createPage("1-penuh");
    const b = createBubble(p.panels[0].id, "narasi", 300, 300);
    expect(gayaTerpakai(b).radius).toBe(4);
    const bulat = { ...b, gaya: { mode: "kotak" as const, radius: 43 } };
    expect(gayaTerpakai(bulat).radius).toBe(43);
    expect(EditorPayloadSchema.safeParse(JSON.parse(JSON.stringify([{ ...p, bubbles: [bulat] }]))).success).toBe(true);
    expect(EditorPayloadSchema.safeParse([{ ...p, bubbles: [{ ...b, gaya: { radius: 500 } }] }]).success).toBe(false);
    expect(EditorPayloadSchema.safeParse([{ ...p, bubbles: [{ ...b, gaya: { radius: -1 } }] }]).success).toBe(false);
  });
});

describe("alat Teks", () => {
  it("menaruh teks polos (mode Teks, tanpa ekor), bukan balon", async () => {
    const { useEditor, clearHistory } = await import("./store");
    const p = createPage("1-penuh");
    useEditor.setState({ pages: [p], activePageId: p.id, selectedId: null, seleksi: [] });
    clearHistory();
    useEditor.getState().addBubble(p.panels[0].id, "narasi", 300, 300, { mode: "teks" });
    const b = useEditor.getState().pages[0].bubbles[0];
    expect(modeBalon(b)).toBe("teks");
    expect(b.tail).toBeNull();
    expect(useEditor.getState().selectedId).toBe(b.id);
    // tanpa gaya awal, balon narasi tetap kotak dan balon bicara tetap balon
    useEditor.getState().addBubble(p.panels[0].id, "bicara", 300, 500);
    expect(modeBalon(useEditor.getState().pages[0].bubbles[1])).toBe("balon");
  });
});

describe("gaya ekor", () => {
  const dasar = (kind: "bicara" | "pikir" | "narasi", extra: object = {}) => ({ ...createBubble("11111111-1111-4111-8111-111111111111", kind, 300, 300), ...extra });
  it("bawaan: lancip, kecuali balon pikir atau bentuk awan", () => {
    expect(gayaTerpakai(dasar("bicara")).ekor).toBe("lancip");
    expect(gayaTerpakai(dasar("pikir")).ekor).toBe("pikir");
    expect(gayaTerpakai(dasar("bicara", { bentuk: "awan" })).ekor).toBe("pikir");
  });
  it("pilihan guru mengalahkan bawaan, untuk bentuk apa pun", () => {
    expect(gayaTerpakai(dasar("bicara", { bentuk: "oval", gaya: { ekor: "pikir" } })).ekor).toBe("pikir");
    expect(gayaTerpakai(dasar("pikir", { gaya: { ekor: "lancip" } })).ekor).toBe("lancip");
  });
  it("tersimpan dan hanya nilai yang dikenal diterima", () => {
    const p = createPage("1-penuh");
    const b = { ...createBubble(p.panels[0].id, "bicara", 300, 300), gaya: { ekor: "pikir" as const } };
    expect(EditorPayloadSchema.safeParse(JSON.parse(JSON.stringify([{ ...p, bubbles: [b] }]))).success).toBe(true);
    expect(EditorPayloadSchema.safeParse([{ ...p, bubbles: [{ ...b, gaya: { ekor: "bulat" } }] }]).success).toBe(false);
  });
});
