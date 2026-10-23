import { describe, expect, it } from "vitest";
import { buildPagePrompt, buildPanelPrompt, ruangBalon } from "./page-prompt";

const req = {
  gaya: "kartun cerah",
  karakter: [{ nama: "Kiki", deskripsi: "anak perempuan, rambut dikuncir dua" }],
  panels: [
    { adegan: "Kiki di depan toko kue", karakter: ["Kiki"], rect: { x: 0.06, y: 0.05, w: 0.88, h: 0.43 } },
    { adegan: "Close-up lampu merah", karakter: [], rect: { x: 0.06, y: 0.52, w: 0.42, h: 0.43 } },
  ],
};

describe("buildPagePrompt", () => {
  it("menyebut setiap panel dengan posisi dan adegannya", () => {
    const p = buildPagePrompt(req);
    expect(p).toContain("2 panel");
    expect(p).toContain("Panel 1 (kiri 6%, atas 5%, lebar 88%, tinggi 43% dari halaman): Kiki di depan toko kue Karakter: Kiki.");
    expect(p).toContain("Panel 2 (kiri 6%, atas 52%, lebar 42%, tinggi 43% dari halaman): Close-up lampu merah");
  });

  it("selalu melarang teks di gambar dan menyertakan deskripsi karakter", () => {
    const p = buildPagePrompt(req);
    expect(p).toMatch(/jangan gambar teks/i);
    expect(p).toMatch(/papan nama toko.*POLOS/i);
    expect(p).toContain("- Kiki: anak perempuan, rambut dikuncir dua");
    expect(p).not.toContain("gambar referensi");
  });

  it("tokoh yang punya potret mengikuti gambar acuan, bukan deskripsi teks yang bisa bertentangan", () => {
    const p = buildPagePrompt({
      ...req,
      karakter: [
        { nama: "Joko", deskripsi: "anak laki-laki rambut panjang merah" },
        { nama: "Kiki", deskripsi: "anak perempuan, rambut dikuncir dua" },
      ],
      referenceImages: [
        { data: new Uint8Array(1), mimeType: "image/webp", label: "potret tokoh Joko", tokoh: "joko" },
        { data: new Uint8Array(1), mimeType: "image/webp", label: "halaman komik sebelumnya" },
      ],
    });
    expect(p).toContain("- Joko: wajah, jenis kelamin, rambut, kacamata, dan pakaian PERSIS seperti gambar referensi 1");
    expect(p).toContain("Bila catatan teks ini berbeda dari gambar, ikuti gambar. Catatan: anak laki-laki rambut panjang merah");
    // tokoh tanpa potret tetap memakai deskripsi biasa
    expect(p).toContain("- Kiki: anak perempuan, rambut dikuncir dua");
    expect(p).toMatch(/IDENTIK di semua panel/);
  });

  it("menyebut gambar referensi beserta labelnya, berurutan", () => {
    const p = buildPagePrompt({
      ...req,
      referenceImages: [
        { data: new Uint8Array(1), mimeType: "image/webp", label: "potret tokoh Sari" },
        { data: new Uint8Array(1), mimeType: "image/webp", label: "halaman pertama komik ini" },
      ],
    });
    expect(p).toContain("Gambar referensi terlampir (urut): 1) potret tokoh Sari; 2) halaman pertama komik ini");
    expect(p).toMatch(/penutup kepala/);
  });

  it("menolak halaman tanpa panel", () => {
    expect(() => buildPagePrompt({ ...req, panels: [] })).toThrow();
  });
});

describe("ruang untuk balon dialog", () => {
  it("jumlah balon tidak diketahui: sepertiga atas dikosongkan", () => {
    const r = ruangBalon();
    expect(r).toContain("sepertiga (sekitar 35%) bagian ATAS bingkai");
    expect(r).toMatch(/tanpa wajah, kepala, tangan/);
    expect(r).toMatch(/tidak ada yang terpotong/);
  });
  it("dua balon atau lebih butuh ruang lebih besar; tanpa balon tidak ada yang disisihkan", () => {
    expect(ruangBalon(2)).toContain("dua perlima (sekitar 40%)");
    expect(ruangBalon(1)).toContain("sepertiga");
    expect(ruangBalon(0)).toBe("");
  });
  it("prompt halaman memasang aturan per panel sesuai jumlah dialognya", () => {
    const p = buildPagePrompt({
      ...req,
      panels: [
        { ...req.panels[0], balon: 3 },
        { ...req.panels[1], balon: 0 },
      ],
    });
    expect(p.match(/KOMPOSISI/g)).toHaveLength(1);
    expect(p).toContain("dua perlima (sekitar 40%) bagian ATAS panel");
  });
  it("prompt per panel (FLUX) menyertakan aturan komposisi", () => {
    const p = buildPanelPrompt({ ...req.panels[0], balon: 1 }, req);
    expect(p).toContain("KOMPOSISI");
    expect(buildPanelPrompt({ ...req.panels[0], balon: 0 }, req)).not.toContain("KOMPOSISI");
  });
});
