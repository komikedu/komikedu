import { describe, expect, it } from "vitest";
import { checkScript } from "@/lib/ai/check";
import type { Script } from "@/lib/ai/schemas";
import { scriptToPages } from "@/lib/editor/from-script";
import { NaskahEditSchema } from "./naskah-edit";
import {
  MAX_BALON,
  formatAngka,
  gantiAngka,
  gantiLayout,
  hapusBalon,
  hapusPanel,
  layoutHalaman,
  panelTerhapusJikaGantiLayout,
  tambahBalon,
  tambahPanel,
  terimaPerbaikan,
} from "./naskah";

const naskah = (): Script => ({
  halaman: [
    {
      urutan: 2,
      panel: [
        {
          urutan: 1,
          adegan: "Doni menghitung kue",
          karakter: ["Doni"],
          dialog: [{ karakter: "Doni", jenis: "bicara", teks: "FPB dari 12 dan 18 adalah 4, jadi 4 kantong!" }],
          hitungan: [{ ekspresi: "gcd(12, 18)", hasilTertulis: 4 }],
        },
      ],
    },
    {
      urutan: 1,
      panel: [
        {
          urutan: 2,
          adegan: "Kiki berpikir",
          karakter: ["Kiki"],
          dialog: [
            { karakter: "Narator", jenis: "narasi", teks: "Di depan toko kue." },
            { karakter: "Kiki", jenis: "pikir", teks: "Kapan lampunya menyala bersama?" },
          ],
          hitungan: [],
        },
        {
          urutan: 1,
          adegan: "Kiki dan Doni di depan toko",
          karakter: ["Kiki", "Doni"],
          dialog: [
            { karakter: "Kiki", jenis: "bicara", teks: "Lampu merah menyala tiap 4 detik dan lampu biru tiap 6 detik." },
            { karakter: "Doni", jenis: "bicara", teks: "KPK-nya 12!" },
            { karakter: "Kiki", jenis: "bicara", teks: "Betul, 12 detik." },
          ],
          hitungan: [{ ekspresi: "lcm(4, 6)", hasilTertulis: 12 }],
        },
        {
          urutan: 3,
          adegan: "Lampu menyala bersama",
          karakter: [],
          dialog: [],
          hitungan: [],
        },
      ],
    },
  ],
});

describe("checkScript (flag dengan indeks dan hasil benar)", () => {
  it("menandai hitungan salah beserta hasil yang benar", () => {
    const flags = checkScript(naskah());
    expect(flags).toEqual([
      expect.objectContaining({ jenis: "hitungan", halaman: 2, panel: 1, hitungan: 0, seharusnya: 6 }),
    ]);
  });
});

describe("gantiAngka", () => {
  it("mengganti angka utuh saja, bukan bagian angka lain", () => {
    expect(gantiAngka("Ada 4 kantong, bukan 40 atau 14 atau 4,5.", 4, 6)).toEqual({
      teks: "Ada 6 kantong, bukan 40 atau 14 atau 4,5.",
      diganti: true,
    });
  });

  it("mengenali desimal koma maupun titik", () => {
    expect(gantiAngka("Hasilnya 0,5 bagian", 0.5, 0.25).teks).toBe("Hasilnya 0,25 bagian");
    expect(gantiAngka("Hasilnya 0.5 bagian", 0.5, 0.25).teks).toBe("Hasilnya 0,25 bagian");
  });

  it("melapor tidak diganti bila angka ditulis dengan huruf", () => {
    expect(gantiAngka("Hasilnya empat", 4, 6)).toEqual({ teks: "Hasilnya empat", diganti: false });
  });

  it("format angka Indonesia", () => {
    expect(formatAngka(0.1 + 0.2)).toBe("0,3");
    expect(formatAngka(12)).toBe("12");
  });
});

describe("terimaPerbaikan", () => {
  it("memperbaiki hasil dan dialog, lalu tanda hilang", () => {
    const { script, diganti } = terimaPerbaikan(naskah(), 2, 1, 0, 6);
    expect(diganti).toBe(true);
    const p = script.halaman.find((h) => h.urutan === 2)!.panel[0];
    expect(p.hitungan[0].hasilTertulis).toBe(6);
    expect(p.dialog[0].teks).toBe("FPB dari 12 dan 18 adalah 6, jadi 6 kantong!");
    expect(checkScript(script)).toEqual([]);
  });

  it("tidak mengubah naskah asli", () => {
    const asli = naskah();
    terimaPerbaikan(asli, 2, 1, 0, 6);
    expect(asli.halaman[0].panel[0].hitungan[0].hasilTertulis).toBe(4);
  });

  it("mengabaikan panel yang tidak ada", () => {
    const asli = naskah();
    expect(terimaPerbaikan(asli, 9, 9, 0, 1)).toEqual({ script: asli, diganti: false });
  });
});

describe("scriptToPages", () => {
  it("membuat halaman berurutan dengan layout sesuai jumlah panel", () => {
    const { pages } = scriptToPages(naskah());
    expect(pages).toHaveLength(2);
    expect(pages[0].panels).toHaveLength(3);
    expect(pages[0].layoutId).toBe("3-satu-atas-dua-bawah");
    expect(pages[1].panels).toHaveLength(1);
  });

  it("mengurutkan panel sesuai urutan naskah dan mengisi adegan", () => {
    const { pages, panelScripts } = scriptToPages(naskah());
    expect(pages[0].panels.map((p) => p.adegan)).toEqual(["Kiki dan Doni di depan toko", "Kiki berpikir", "Lampu menyala bersama"]);
    expect(panelScripts.get(pages[0].panels[0].id)?.hitungan).toEqual([{ ekspresi: "lcm(4, 6)", hasilTertulis: 12 }]);
  });

  it("membuat satu balon per dialog, jenis sesuai, narasi tanpa ekor", () => {
    const { pages } = scriptToPages(naskah());
    const [p1, p2] = pages[0].panels;
    const b1 = pages[0].bubbles.filter((b) => b.panelId === p1.id);
    const b2 = pages[0].bubbles.filter((b) => b.panelId === p2.id);
    expect(b1.map((b) => b.text)).toEqual([
      "Lampu merah menyala tiap 4 detik dan lampu biru tiap 6 detik.",
      "KPK-nya 12!",
      "Betul, 12 detik.",
    ]);
    expect(b2.map((b) => b.kind)).toEqual(["narasi", "pikir"]);
    expect(b2[0].tail).toBeNull();
    expect(b2[1].tail).not.toBeNull();
  });

  it("semua balon berada di dalam panelnya", () => {
    const { pages } = scriptToPages(naskah());
    for (const page of pages) {
      for (const b of page.bubbles) {
        const p = page.panels.find((x) => x.id === b.panelId)!;
        expect(b.x).toBeGreaterThanOrEqual(p.x);
        expect(b.y).toBeGreaterThanOrEqual(p.y);
        expect(b.x + b.w).toBeLessThanOrEqual(p.x + p.w);
        expect(b.y + b.h).toBeLessThanOrEqual(p.y + p.h);
      }
    }
  });

  it("id unik untuk semua halaman, panel, dan balon", () => {
    const { pages } = scriptToPages(naskah());
    const ids = pages.flatMap((p) => [p.id, ...p.panels.map((x) => x.id), ...p.bubbles.map((x) => x.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

const hal1 = (s: Script) => s.halaman.find((h) => h.urutan === 1)!;

describe("layout dan struktur halaman", () => {
  it("layoutHalaman memakai pilihan guru bila cocok, kalau tidak default", () => {
    expect(layoutHalaman(hal1(naskah()))).toBe("3-satu-atas-dua-bawah");
    expect(layoutHalaman({ ...hal1(naskah()), layout: "3-tiga-baris" })).toBe("3-tiga-baris");
    expect(layoutHalaman({ ...hal1(naskah()), layout: "4-grid" })).toBe("3-satu-atas-dua-bawah"); // jumlah panel tidak cocok
    expect(layoutHalaman({ ...hal1(naskah()), layout: "ngawur" })).toBe("3-satu-atas-dua-bawah");
  });

  it("ganti ke layout dengan jumlah panel sama hanya mengubah layout", () => {
    const s = gantiLayout(naskah(), 1, "3-tiga-baris");
    expect(hal1(s).layout).toBe("3-tiga-baris");
    expect(hal1(s).panel.map((p) => p.adegan)).toEqual(["Kiki dan Doni di depan toko", "Kiki berpikir", "Lampu menyala bersama"]);
  });

  it("ganti ke layout 4 panel menambah panel kosong dan memunculkan tanda adegan kosong", () => {
    const s = gantiLayout(naskah(), 1, "4-grid");
    expect(hal1(s).panel).toHaveLength(4);
    expect(hal1(s).panel[3]).toMatchObject({ urutan: 4, adegan: "", dialog: [] });
    expect(checkScript(s).filter((f) => f.jenis === "adegan-kosong")).toEqual([expect.objectContaining({ halaman: 1, panel: 4 })]);
    expect(NaskahEditSchema.safeParse(s).success).toBe(true);
  });

  it("ganti ke layout 2 panel membuang panel terakhir, dan jumlah panel berisi yang hilang bisa dihitung", () => {
    expect(panelTerhapusJikaGantiLayout(hal1(naskah()), "2-kiri-kanan")).toBe(1); // panel 3 tanpa dialog tapi adegannya terisi
    const s = gantiLayout(naskah(), 1, "1-penuh");
    expect(hal1(s).panel.map((p) => p.urutan)).toEqual([1]);
    expect(panelTerhapusJikaGantiLayout(hal1(naskah()), "1-penuh")).toBe(2);
  });

  it("tambah panel sampai maksimal 4", () => {
    let s = tambahPanel(naskah(), 1);
    expect(hal1(s).panel.map((p) => p.urutan)).toEqual([1, 2, 3, 4]);
    expect(layoutHalaman(hal1(s))).toBe("4-grid");
    s = tambahPanel(s, 1);
    expect(hal1(s).panel).toHaveLength(4);
  });

  it("hapus panel mengurutkan ulang nomor dan menyisakan minimal 1", () => {
    let s = hapusPanel(naskah(), 1, 1);
    expect(hal1(s).panel.map((p) => [p.urutan, p.adegan])).toEqual([
      [1, "Kiki berpikir"],
      [2, "Lampu menyala bersama"],
    ]);
    s = hapusPanel(hapusPanel(s, 1, 1), 1, 1);
    expect(hal1(s).panel).toHaveLength(1);
  });

  it("tambah balon (maks. 6) memunculkan tanda balon kosong, hapus balon menghilangkannya", () => {
    let s = tambahBalon(naskah(), 1, 3);
    expect(hal1(s).panel[2].dialog).toEqual([{ karakter: "", jenis: "bicara", teks: "" }]);
    expect(checkScript(s).some((f) => f.jenis === "balon-kosong")).toBe(true);
    s = hapusBalon(s, 1, 3, 0);
    expect(checkScript(s).some((f) => f.jenis === "balon-kosong")).toBe(false);
    for (let i = 0; i < 10; i++) s = tambahBalon(s, 1, 1);
    expect(hal1(s).panel[0].dialog).toHaveLength(MAX_BALON);
  });

  it("fungsi struktur tidak mengubah naskah asli", () => {
    const asli = naskah();
    const salinan = structuredClone(asli);
    gantiLayout(asli, 1, "4-grid");
    tambahPanel(asli, 1);
    hapusPanel(asli, 1, 1);
    tambahBalon(asli, 1, 1);
    hapusBalon(asli, 1, 1, 0);
    expect(asli).toEqual(salinan);
  });

  it("layout tidak cocok ditolak saat menyimpan", () => {
    const s = naskah();
    hal1(s).layout = "4-grid";
    expect(NaskahEditSchema.safeParse(s).success).toBe(false);
  });

  it("scriptToPages memakai layout pilihan guru", () => {
    const { pages } = scriptToPages(gantiLayout(naskah(), 1, "3-dua-atas-satu-bawah"));
    expect(pages[0].layoutId).toBe("3-dua-atas-satu-bawah");
  });
});
