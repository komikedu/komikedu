import { describe, expect, it } from "vitest";
import { createPage } from "./factory";
import { bandingAlami, nomorDariNama, namaBerkasPanel, usulkanPemasangan, waktuDariNama } from "./impor-gambar";

describe("nomorDariNama", () => {
  it.each([
    ["1-1.png", 1, 1],
    ["2_3.webp", 2, 3],
    ["3.4.jpg", 3, 4],
    ["4 2.png", 4, 2],
    ["h1p2.png", 1, 2],
    ["H2P10.png", 2, 10],
    ["Halaman 2 Panel 3.png", 2, 3],
    ["halaman2-panel5", 2, 5],
    ["10-6.png", 10, 6],
    ["1-1 (2).png", 1, 1],
  ])("%s -> halaman %i panel %i", (nama, h, p) => {
    expect(nomorDariNama(nama)).toEqual({ halaman: h, panel: p });
  });
  it.each(["Boy_adjusting_toy_clock_hands_20261023211230.png", "20261023211230.png", "11.png", "1.png", "foto.png", "Girl_smiling_20261023.png", "0-1.png", "1-0.png", "gambar 1-1.png"])("%s bukan nomor panel", (nama) => {
    expect(nomorDariNama(nama)).toBeNull();
  });
});

describe("usulkanPemasangan", () => {
  const pages = () => [createPage("2-atas-bawah"), createPage("3-satu-atas-dua-bawah")]; // 2 + 3 panel
  const nama = (u: { berkas: { name: string }; tujuan: { halaman: number; panel: number } | null }[]) => u.map((x) => `${x.berkas.name}>${x.tujuan ? `${x.tujuan.halaman}-${x.tujuan.panel}` : "-"}`);

  it("berkas bernomor dipasang sesuai nomornya, urutan berkas tidak berpengaruh", () => {
    const u = usulkanPemasangan([{ name: "2-3.png" }, { name: "1-1.png" }, { name: "2-1.png" }, { name: "1-2.png" }], pages());
    expect(nama(u)).toEqual(["1-1.png>1-1", "1-2.png>1-2", "2-1.png>2-1", "2-3.png>2-3"]);
    expect(u.every((x) => x.sumber === "nama")).toBe(true);
  });
  it("berkas tanpa nomor mengisi panel kosong berurutan menurut nama alami", () => {
    const u = usulkanPemasangan([{ name: "gambar10.png" }, { name: "gambar2.png" }, { name: "gambar1.png" }], pages());
    expect(nama(u)).toEqual(["gambar1.png>1-1", "gambar2.png>1-2", "gambar10.png>2-1"]);
    expect(u.every((x) => x.sumber === "urutan")).toBe(true);
  });
  it("berkas tanpa nomor tidak menimpa panel yang sudah dipakai berkas bernomor atau sudah bergambar", () => {
    const p = pages();
    p[0].panels[0].imageUrl = "https://x/a.webp";
    const u = usulkanPemasangan([{ name: "1-2.png" }, { name: "a.png" }, { name: "b.png" }], p);
    expect(nama(u)).toEqual(["1-2.png>1-2", "a.png>2-1", "b.png>2-2"]);
  });
  it("nomor yang tidak ada dan nomor ganda ditandai, bukan dipasang diam-diam", () => {
    const u = usulkanPemasangan([{ name: "9-9.png" }, { name: "1-1.png" }, { name: "1-1 (2).png" }], pages());
    const tak = u.filter((x) => !x.tujuan);
    expect(tak.map((x) => x.berkas.name).sort()).toEqual(["1-1 (2).png".toString(), "9-9.png"].sort());
    expect(tak.every((x) => x.sumber === "tidak-ada" || x.sumber === "urutan")).toBe(true);
    expect(u.find((x) => x.berkas.name === "9-9.png")?.catatan).toContain("tidak ada");
  });
  it("kelebihan berkas dari panel kosong ditandai", () => {
    const u = usulkanPemasangan(Array.from({ length: 7 }, (_, i) => ({ name: `f${i + 1}.png` })), pages());
    expect(u.filter((x) => x.tujuan)).toHaveLength(5);
    expect(u.filter((x) => !x.tujuan)).toHaveLength(2);
    expect(u.at(-1)?.catatan).toContain("Tidak ada panel kosong");
  });
  it("panel tersembunyi dilewati dalam penomoran", () => {
    const p = pages();
    p[0].panels[0].visible = false;
    const u = usulkanPemasangan([{ name: "1-1.png" }], p);
    expect(u[0].tujuan?.panelId).toBe(p[0].panels[1].id);
  });
});

describe("pembantu", () => {
  it("pembanding alami dan nama berkas panel", () => {
    expect(["a10", "a2", "a1"].sort(bandingAlami)).toEqual(["a1", "a2", "a10"]);
    expect(namaBerkasPanel(2, 3)).toBe("2-3");
  });
});

describe("opsi pemasangan", () => {
  const pages = () => [createPage("2-atas-bawah"), createPage("3-satu-atas-dua-bawah")];
  const nama = (u: { berkas: { name: string }; tujuan: { halaman: number; panel: number } | null }[]) => u.map((x) => `${x.berkas.name}>${x.tujuan ? `${x.tujuan.halaman}-${x.tujuan.panel}` : "-"}`);

  it("waktu dari nama berkas unduhan Flow", () => {
    expect(waktuDariNama("Boy_clapping_proudly_20261023211230.png")).toBe(20261023211230);
    expect(waktuDariNama("Boy_x_20261023211230_2.png")).toBe(20261023211230);
    expect(waktuDariNama("foto.png")).toBeNull();
    expect(waktuDariNama("1-1.png")).toBeNull();
  });
  it("urut waktu memakai stempel di nama, lalu waktu berkas, lalu nama", () => {
    const u = usulkanPemasangan(
      [{ name: "B_20261023211300.png" }, { name: "A_20261023211200.png" }, { name: "C.png", waktu: 20261023211250 }],
      pages(),
      { urutWaktu: true },
    );
    expect(nama(u)).toEqual(["A_20261023211200.png>1-1", "C.png>1-2", "B_20261023211300.png>2-1"]);
  });
  it("tanpa urut waktu, urutannya menurut nama", () => {
    const u = usulkanPemasangan([{ name: "B_20261023211300.png" }, { name: "A_20261023211400.png" }], pages());
    expect(nama(u)).toEqual(["A_20261023211400.png>1-1", "B_20261023211300.png>1-2"]);
  });
  it("mulai di panel pilihan: mengisi panel itu dan sesudahnya, termasuk yang sudah bergambar", () => {
    const p = pages();
    p[0].panels[0].imageUrl = "https://x/a.webp";
    p[1].panels[0].imageUrl = "https://x/b.webp";
    const u = usulkanPemasangan([{ name: "a.png" }, { name: "b.png" }, { name: "c.png" }], p, { mulaiDi: p[0].panels[1].id });
    expect(nama(u)).toEqual(["a.png>1-2", "b.png>2-1", "c.png>2-2"]);
  });
});
