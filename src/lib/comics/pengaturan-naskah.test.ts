import { describe, expect, it } from "vitest";
import { pengaturanBerubah, sidikPengaturan } from "./pengaturan-naskah";

const dasar = { sumber: "cerita", cerita: "Kancil dan Buaya", jenjang: 5, gaya: "kartun-cerah", jumlah_halaman: 4, halaman_otomatis: false, tokoh_json: [{ id: "a", nama: "Kancil", peran: "", deskripsi: "kecil", preset: false }] };

describe("sidikPengaturan", () => {
  it("sama untuk pengaturan yang sama, termasuk spasi dan null versus kosong", () => {
    expect(sidikPengaturan({ ...dasar, cerita: "  Kancil dan Buaya ", tujuan: "" })).toBe(sidikPengaturan({ ...dasar, tujuan: null }));
  });

  it("berubah bila jumlah halaman, otomatis, gaya, cerita, sampul, atau tokoh berubah", () => {
    const awal = sidikPengaturan(dasar);
    for (const ubah of [{ jumlah_halaman: 6 }, { halaman_otomatis: true }, { gaya: "buku-cerita" }, { cerita: "lain" }, { dengan_sampul: true }, { panel_per_halaman: 3 }, { tokoh_json: [] }]) {
      expect(sidikPengaturan({ ...dasar, ...ubah }), JSON.stringify(ubah)).not.toBe(awal);
    }
  });

  it("jumlah halaman tidak berpengaruh saat otomatis, dan urutan tokoh tidak berpengaruh", () => {
    expect(sidikPengaturan({ ...dasar, halaman_otomatis: true, jumlah_halaman: 4 })).toBe(sidikPengaturan({ ...dasar, halaman_otomatis: true, jumlah_halaman: 8 }));
    const b = { id: "b", nama: "Buaya", peran: "", deskripsi: "hijau", preset: false };
    expect(sidikPengaturan({ ...dasar, tokoh_json: [...dasar.tokoh_json, b] })).toBe(sidikPengaturan({ ...dasar, tokoh_json: [b, ...dasar.tokoh_json] }));
  });
});

describe("pengaturanBerubah", () => {
  it("naskah lama tanpa sidik tidak ditandai", () => {
    expect(pengaturanBerubah(null, dasar)).toBe(false);
  });
  it("menandai hanya bila sidik berbeda", () => {
    const s = sidikPengaturan(dasar);
    expect(pengaturanBerubah(s, dasar)).toBe(false);
    expect(pengaturanBerubah(s, { ...dasar, jenjang: 6 })).toBe(true);
  });
});
