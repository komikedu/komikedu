import { describe, expect, it } from "vitest";
import { alamatPotret, buatPromptFlow, rasioTerdekat, tokohDiTeks } from "./prompt-flow";
import type { Tokoh } from "./tokoh";

const doni: Tokoh = { id: "doni", nama: "Doni", peran: "Murid", deskripsi: "anak laki-laki berkacamata", preset: true };
const rina: Tokoh = { id: "tokoh-x", nama: "Rina", peran: "", deskripsi: "anak perempuan berkepang", preset: false, potret: "https://r2.example/u/c/rina.webp" };
const polos: Tokoh = { id: "tokoh-y", nama: "Eko", peran: "", deskripsi: "anak berkaus merah", preset: false };

describe("rasioTerdekat", () => {
  it("memilih rasio Flow terdekat", () => {
    expect(rasioTerdekat(800, 600)).toBe("4:3");
    expect(rasioTerdekat(500, 500)).toBe("1:1");
    expect(rasioTerdekat(300, 800)).toBe("9:16");
    expect(rasioTerdekat(900, 500)).toBe("16:9");
    expect(rasioTerdekat(600, 800)).toBe("3:4");
  });
  it("aman untuk ukuran tidak valid", () => {
    expect(rasioTerdekat(0, 0)).toBe("1:1");
  });
});

describe("tokohDiTeks", () => {
  it("mencocokkan nama tanpa peduli huruf besar", () => {
    expect(tokohDiTeks([doni, rina, polos], "doni dan @RINA di kelas").map((t) => t.nama)).toEqual(["Doni", "Rina"]);
  });
  it("kosong bila tidak ada nama", () => {
    expect(tokohDiTeks([doni], "kelas kosong")).toEqual([]);
  });
});

describe("alamatPotret", () => {
  it("preset memakai berkas sesuai gaya", () => {
    expect(alamatPotret(doni, "anime-lembut")).toContain("doni");
    expect(alamatPotret(doni, "anime-lembut")).toContain("anime-lembut");
  });
  it("tokoh buatan memakai potret, atau null bila belum ada", () => {
    expect(alamatPotret(rina, null)).toBe("https://r2.example/u/c/rina.webp");
    expect(alamatPotret(polos, null)).toBeNull();
  });
});

describe("buatPromptFlow", () => {
  const dasar = { adegan: "@Doni menunjuk papan tulis", gaya: "kartun cerah", rasio: "4:3" };
  it("memuat adegan, gaya, rasio, dan aturan tanpa teks", () => {
    const p = buatPromptFlow({ ...dasar, tokoh: [doni] });
    expect(p).toContain("Adegan: Doni menunjuk papan tulis");
    expect(p).not.toContain("@");
    expect(p).toContain("gaya kartun cerah");
    expect(p).toContain("rasio 4:3");
    expect(p).toContain("jangan gambar teks");
    expect(p).toContain("- Doni: anak laki-laki berkacamata");
  });
  it("menyebut berkas acuan hanya untuk tokoh yang punya", () => {
    const p = buatPromptFlow({ ...dasar, tokoh: [doni, polos], acuan: { Doni: "Doni.png" } });
    expect(p).toContain('gambar acuan "Doni.png"');
    expect(p).toContain("- Eko: anak berkaus merah");
    expect(p).not.toContain("acuan \"Eko");
  });
  it("tanpa tokoh tidak ada bagian tokoh", () => {
    expect(buatPromptFlow({ ...dasar, tokoh: [] })).not.toContain("Tokoh yang tampil");
  });
  it("menolak adegan kosong", () => {
    expect(() => buatPromptFlow({ ...dasar, adegan: "  ", tokoh: [] })).toThrow();
  });
});

describe("buatPromptFlow: ruang untuk balon dialog", () => {
  const dasar = { adegan: "Doni menunjuk jam.", gaya: "kartun", tokoh: [doni], rasio: "4:3" };
  it("menyisakan bagian atas untuk balon", () => {
    expect(buatPromptFlow({ ...dasar, balon: 2 })).toContain("dua perlima (sekitar 40%) bagian ATAS bingkai");
    expect(buatPromptFlow(dasar)).toContain("sepertiga (sekitar 35%) bagian ATAS bingkai");
  });
  it("panel tanpa dialog tidak menyisihkan ruang", () => {
    expect(buatPromptFlow({ ...dasar, balon: 0 })).not.toContain("KOMPOSISI");
  });
});
