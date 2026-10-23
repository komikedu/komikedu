import { describe, expect, it } from "vitest";
import type { Script } from "@/lib/ai/schemas";
import { barisDialog, buatNaskahFlow, teksNaskah } from "./naskah-flow";
import type { Tokoh } from "./tokoh";

const doni: Tokoh = { id: "doni", nama: "Doni", peran: "Murid", deskripsi: "anak laki-laki berkacamata", preset: true };

const naskah: Script = {
  halaman: [
    {
      urutan: 2,
      panel: [
        { urutan: 1, adegan: "Doni di kelas", karakter: ["Doni"], dialog: [{ karakter: "Doni", jenis: "bicara", teks: "Halo!" }], hitungan: [] },
        { urutan: 2, adegan: "  ", karakter: [], dialog: [], hitungan: [] },
      ],
    },
    {
      urutan: 1,
      panel: [
        { urutan: 1, adegan: "Pagi hari", karakter: [], dialog: [{ karakter: "Narator", jenis: "narasi", teks: "Pagi itu cerah." }, { karakter: "Doni", jenis: "pikir", teks: "Hmm" }], hitungan: [] },
      ],
    },
  ],
};

describe("buatNaskahFlow", () => {
  const j = buatNaskahFlow({ judul: "KPK", gaya: "faceless", tokoh: [doni], naskah });

  it("satu item per panel yang beradegan, berurutan halaman lalu panel", () => {
    expect(j.panel.map((p) => [p.no, p.halaman, p.panel])).toEqual([
      [1, 1, 1],
      [2, 2, 1],
    ]);
  });
  it("tiap prompt berdiri sendiri: gaya, adegan, dan tokoh yang muncul", () => {
    expect(j.panel[0].prompt).toContain("faceless");
    expect(j.panel[0].prompt).toContain("Adegan: Pagi hari");
    // Doni tampil di panel 1 karena punya dialog di sana, walau tidak disebut di adegan
    expect(j.panel[0].prompt).toContain("- Doni: anak laki-laki berkacamata");
    expect(j.panel[1].prompt).toContain("- Doni: anak laki-laki berkacamata");
  });
  it("memberi rasio dari bentuk panel di layout", () => {
    expect(j.panel[0].rasio).toBe("3:4"); // satu panel penuh
    expect(j.panel[1].rasio).toBe("4:3"); // dua panel atas-bawah
  });
  it("memuat petunjuk, tokoh, dan dialog sebagai konteks", () => {
    expect(j.petunjuk).toContain("SETIAP item");
    expect(j.tokoh).toEqual([{ nama: "Doni", deskripsi: "anak laki-laki berkacamata" }]);
    expect(j.panel[1].dialog).toHaveLength(1);
  });
  it("gaya tidak dikenal memakai gaya pertama", () => {
    expect(buatNaskahFlow({ judul: "x", gaya: null, tokoh: [], naskah }).gaya).toBe("Kartun cerah");
  });
});

describe("teksNaskah", () => {
  it("format skrip komik berurutan dengan dialog per baris", () => {
    const t = teksNaskah("KPK dan FPB", naskah);
    expect(t.split("\n")).toEqual([
      "KPK DAN FPB",
      "",
      "HALAMAN 1",
      "",
      "Panel 1",
      "Adegan: Pagi hari",
      "NARASI: Pagi itu cerah.",
      "DONI (pikir): Hmm",
      "",
      "HALAMAN 2",
      "",
      "Panel 1",
      "Adegan: Doni di kelas",
      "DONI: Halo!",
      "",
      "Panel 2",
      "Adegan: (belum diisi)",
    ]);
  });
});

describe("barisDialog", () => {
  it("nama kosong tetap menghasilkan baris", () => {
    expect(barisDialog({ karakter: " ", jenis: "bicara", teks: "Hai" })).toBe("?: Hai");
  });
});
