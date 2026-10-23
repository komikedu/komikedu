import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/storage/gambar", () => ({
  kunciKomik: (url: string, userId: string, comicId: string) => (url.startsWith(`https://cdn/${userId}/${comicId}/`) ? url.slice(12) : null),
}));
vi.mock("@/lib/comics/versi-gambar", () => ({ catatVersi: vi.fn() }));

const { createPage, createStiker } = await import("./factory");
const { EditorPayloadSchema, fromNested, toRows } = await import("./persist");
const { saveEditorData } = await import("./save");
const { duplicatePage } = await import("./page-ops");

const U = "u1";
const C = "c1";
const comicId = "11111111-1111-4111-8111-111111111111";

describe("stiker", () => {
  it("memuat gambar dengan rasio yang dipertahankan dan di tengah halaman", () => {
    const lebar = createStiker("https://cdn/a.png", 2);
    expect(lebar.w / lebar.h).toBeCloseTo(2, 1);
    expect(lebar.panelId).toBeNull();
    const tinggi = createStiker("https://cdn/a.png", 0.5);
    expect(tinggi.h).toBeGreaterThan(tinggi.w);
    expect(createStiker("https://cdn/a.png", Number.NaN).w).toBe(420);
  });

  it("tersimpan di kolom halaman, dimuat kembali, dan ikut tersalin saat halaman diduplikat", () => {
    const p = createPage("1-penuh");
    p.elements.push(createStiker("https://cdn/a.png", 1));
    const parsed = EditorPayloadSchema.safeParse(JSON.parse(JSON.stringify([p])));
    expect(parsed.success).toBe(true);
    const rows = toRows("c", parsed.success ? parsed.data : []);
    expect(rows.pages[0].elemen_bebas[0]).toMatchObject({ kind: "stiker", url: "https://cdn/a.png" });
    const muat = fromNested([{ id: p.id, urutan: 1, template_layout: p.layoutId, elemen_bebas: rows.pages[0].elemen_bebas, panels: [] }]);
    expect(muat[0].elements[0]).toMatchObject({ kind: "stiker", panelId: null });
    const pages = [p];
    const baru = duplicatePage(pages, p.id)!;
    expect(pages[1].id).toBe(baru);
    expect(pages[1].elements).toHaveLength(1);
    expect(pages[1].elements[0].id).not.toBe(p.elements[0].id);
    expect(pages[1].elements[0].panelId).toBeNull();
  });

  it("server menolak stiker yang menunjuk gambar bukan milik komik ini", async () => {
    const p = createPage("1-penuh");
    p.elements.push(createStiker("https://cdn/orang-lain/x/a.png", 1));
    const supabase = {} as never;
    const res = await saveEditorData(supabase, U, comicId, JSON.parse(JSON.stringify([p])));
    expect(res).toMatchObject({ ok: false, status: 400 });
  });

  it("server menerima stiker milik komik ini (lolos sampai pemeriksaan kepemilikan komik)", async () => {
    const p = createPage("1-penuh");
    p.elements.push(createStiker(`https://cdn/${U}/${comicId}/a.png`, 1));
    const kosong = { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) }) } as never;
    const res = await saveEditorData(kosong, U, comicId, JSON.parse(JSON.stringify([p])));
    expect(res).toMatchObject({ ok: false, status: 404 });
    void C;
  });
});
