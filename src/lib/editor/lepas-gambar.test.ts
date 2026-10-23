import { describe, expect, it } from "vitest";
import { createPage } from "./factory";
import { MAX_BYTES_LEPAS, panelDiTitik, panelTujuan, pilihBerkasGambar, seretanBerkas, titikDalamPoligon } from "./lepas-gambar";

const berkas = (name: string, type = "image/png", size = 1000) => ({ name, type, size });

describe("titikDalamPoligon", () => {
  const kotak = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
  const miring = [
    { x: 0, y: 0 },
    { x: 10, y: 4 },
    { x: 10, y: 10 },
    { x: 0, y: 6 },
  ];

  it("di dalam, di luar, dan tepat di tepi", () => {
    expect(titikDalamPoligon({ x: 5, y: 5 }, kotak)).toBe(true);
    expect(titikDalamPoligon({ x: 11, y: 5 }, kotak)).toBe(false);
    expect(titikDalamPoligon({ x: 0, y: 5 }, kotak)).toBe(true);
    expect(titikDalamPoligon({ x: 10, y: 10 }, kotak)).toBe(true);
    expect(titikDalamPoligon({ x: -0.1, y: 5 }, kotak)).toBe(false);
  });

  it("mengikuti sisi miring, bukan kotak pembatasnya", () => {
    expect(titikDalamPoligon({ x: 8, y: 3 }, miring)).toBe(false); // di atas sisi atas yang miring
    expect(titikDalamPoligon({ x: 8, y: 6 }, miring)).toBe(true);
    expect(titikDalamPoligon({ x: 2, y: 9 }, miring)).toBe(false);
  });
});

describe("panelDiTitik", () => {
  const page = createPage("2-kiri-kanan");
  const [kiri, kanan] = page.panels;

  it("menemukan panel di titik, atau null di celah dan di luar halaman", () => {
    expect(panelDiTitik(page.panels, { x: kiri.x + 10, y: kiri.y + 10 })?.id).toBe(kiri.id);
    expect(panelDiTitik(page.panels, { x: kanan.x + 10, y: kanan.y + 10 })?.id).toBe(kanan.id);
    expect(panelDiTitik(page.panels, { x: kiri.x + kiri.w + 1, y: kiri.y + 10 })).toBeNull(); // celah antar panel
    expect(panelDiTitik(page.panels, { x: -50, y: -50 })).toBeNull();
  });

  it("panel yang disembunyikan dilewati, dan panel di atas menang saat bertumpuk", () => {
    const atas = { ...kanan, id: "atas", x: kiri.x, y: kiri.y, w: 50, h: 50 };
    expect(panelDiTitik([kiri, atas], { x: kiri.x + 10, y: kiri.y + 10 })?.id).toBe("atas");
    expect(panelDiTitik([kiri, { ...atas, visible: false }], { x: kiri.x + 10, y: kiri.y + 10 })?.id).toBe(kiri.id);
  });

  it("panel miring hanya cocok di dalam sisinya", () => {
    const p = { ...kiri, corners: [{ x: 0, y: 0 }, { x: 100, y: 40 }, { x: 100, y: 100 }, { x: 0, y: 60 }], x: 0, y: 0, w: 100, h: 100 };
    expect(panelDiTitik([p], { x: 80, y: 20 })).toBeNull();
    expect(panelDiTitik([p], { x: 80, y: 70 })?.id).toBe(p.id);
  });
});

describe("pilihBerkasGambar", () => {
  it("menerima JPG, PNG, WebP dalam batas ukuran", () => {
    const hasil = pilihBerkasGambar([berkas("a.png"), berkas("b.jpg", "image/jpeg"), berkas("c.webp", "image/webp")], 3);
    expect(hasil.berkas.map((f) => f.name)).toEqual(["a.png", "b.jpg", "c.webp"]);
    expect(hasil.pesan).toBeNull();
  });

  it("menolak tipe lain, kosong, dan terlalu besar, dengan pesan", () => {
    expect(pilihBerkasGambar([berkas("a.gif", "image/gif"), berkas("b.pdf", "application/pdf")], 2)).toMatchObject({ berkas: [], ditolak: 2, pesan: expect.stringMatching(/JPG, PNG, atau WebP/) });
    expect(pilihBerkasGambar([berkas("kosong.png", "image/png", 0)], 1).berkas).toHaveLength(0);
    expect(pilihBerkasGambar([berkas("besar.png", "image/png", MAX_BYTES_LEPAS + 1)], 1).berkas).toHaveLength(0);
    expect(pilihBerkasGambar([berkas("pas.png", "image/png", MAX_BYTES_LEPAS)], 1).berkas).toHaveLength(1);
    expect(pilihBerkasGambar([], 1).pesan).toMatch(/Tidak ada/);
  });

  it("dibatasi sebanyak panel yang tersedia, sisanya dilaporkan", () => {
    const hasil = pilihBerkasGambar([berkas("1.png"), berkas("2.png"), berkas("3.png"), berkas("x.gif", "image/gif")], 2);
    expect(hasil.berkas.map((f) => f.name)).toEqual(["1.png", "2.png"]);
    expect(hasil.pesan).toMatch(/1 berkas dilewati \(bukan JPG/);
    expect(hasil.pesan).toMatch(/1 berkas dilewati karena panel tidak cukup/);
    expect(pilihBerkasGambar([berkas("1.png")], 0).berkas).toHaveLength(0);
  });
});

describe("panelTujuan dan seretanBerkas", () => {
  const page = createPage("4-grid");
  const [p1, p2, p3, p4] = page.panels;

  it("mulai dari panel yang dituju menurut urutan baca, melewati panel tersembunyi", () => {
    expect(panelTujuan(page.panels, p2.id, 2).map((p) => p.id)).toEqual([p2.id, p3.id]);
    expect(panelTujuan(page.panels, p3.id, 5).map((p) => p.id)).toEqual([p3.id, p4.id]);
    expect(panelTujuan([p1, { ...p2, visible: false }, p3], p1.id, 3).map((p) => p.id)).toEqual([p1.id, p3.id]);
    expect(panelTujuan(page.panels, "tidak-ada", 2)).toEqual([]);
  });

  it("seretan dengan berkas dikenali, teks atau tautan tidak", () => {
    expect(seretanBerkas(["Files"])).toBe(true);
    expect(seretanBerkas(["text/plain", "Files"])).toBe(true);
    expect(seretanBerkas(["text/uri-list"])).toBe(false);
    expect(seretanBerkas(undefined)).toBe(false);
  });
});
