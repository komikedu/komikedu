import { describe, expect, it } from "vitest";
import { checkScript } from "./check";
import { jumlahBendaDiAdegan } from "./jumlah";
import { flagMemblokir } from "./schemas";

describe("jumlahBendaDiAdegan", () => {
  it("mendeteksi jumlah benda dengan angka maupun huruf", () => {
    expect(jumlahBendaDiAdegan("Sari menghitung 10 apel di atas meja.")).toEqual(["10 apel"]);
    expect(jumlahBendaDiAdegan("Ada sepuluh kelereng biru dan tiga buah jeruk.")).toEqual(["sepuluh kelereng", "tiga buah jeruk"]);
    expect(jumlahBendaDiAdegan("Dua belas pensil tersusun rapi.")).toEqual(["Dua belas pensil"]);
  });

  it("mengabaikan angka yang bukan jumlah benda di gambar", () => {
    expect(jumlahBendaDiAdegan("Doni, siswa kelas 5, datang jam 7 pagi.")).toEqual([]);
    expect(jumlahBendaDiAdegan("Segitiga punya tiga sisi dan tiga sudut.")).toEqual([]);
    expect(jumlahBendaDiAdegan("Sari dan Doni berjalan ke taman.")).toEqual([]);
  });

  it("tidak salah menangkap angka di dalam kata", () => {
    expect(jumlahBendaDiAdegan("Ruang A12 kosong")).toEqual([]);
  });
});

describe("checkScript: jumlah-di-gambar", () => {
  it("memberi saran yang tidak memblokir", () => {
    const flags = checkScript({
      halaman: [{ urutan: 1, panel: [{ urutan: 1, adegan: "Sari menghitung 10 apel di meja.", dialog: [], hitungan: [] }] }],
    } as never);
    expect(flags.map((f) => f.jenis)).toEqual(["jumlah-di-gambar"]);
    expect(flags.filter(flagMemblokir)).toEqual([]);
  });
});
