import { describe, expect, it } from "vitest";
import { jumlahBendaDiAdegan } from "./jumlah";

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
