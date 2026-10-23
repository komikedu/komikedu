import type { JenisLatar, Latar } from "./types";

/**
 * Pola latar panel gaya komik: titik halftone, sinar, garis, dan gradasi. Semua dihitung dengan kode (bukan gambar),
 * jadi tajam di semua ukuran dan persis sama di editor, PDF, dan salinan terbit. Fungsi di sini murni: hanya geometri
 * dan CSS; penggambaran Konva ada di bentuk-halaman.tsx.
 *
 * Koordinat lokal panel: (0,0) di pojok kiri atas, lebar `w`, tinggi `h`. Sudut dalam derajat, 0 = ke kanan,
 * 90 = ke bawah (sumbu y kanvas ke bawah).
 */

export const JENIS_LATAR: { id: JenisLatar; nama: string }[] = [
  { id: "polos", nama: "Warna polos" },
  { id: "halftone", nama: "Titik halftone" },
  { id: "halftone-pudar", nama: "Titik memudar" },
  { id: "sinar", nama: "Sinar" },
  { id: "garis", nama: "Garis" },
  { id: "gradasi", nama: "Gradasi" },
];

export const WARNA_HEX = /^#[0-9a-fA-F]{6}$/;

/** Rentang dan nama pengaturan "ukuran" untuk tiap jenis; null bila jenis itu tidak punya. */
export function aturanUkuran(jenis: JenisLatar): { min: number; max: number; label: string; bawaan: number } | null {
  switch (jenis) {
    case "halftone":
    case "halftone-pudar":
      return { min: 10, max: 60, label: "Jarak titik", bawaan: 22 };
    case "sinar":
      return { min: 8, max: 60, label: "Jumlah sinar", bawaan: 32 };
    case "garis":
      return { min: 10, max: 120, label: "Lebar garis", bawaan: 40 };
    default:
      return null;
  }
}

/** Jenis ini memakai sudut (semua kecuali warna polos). */
export const pakaiSudut = (jenis: JenisLatar) => jenis !== "polos";

/** Pola siap pakai, terinspirasi halaman komik: dipilih dengan satu klik lalu bisa diubah warna, ukuran, dan sudutnya. */
export const PRESET_LATAR: { id: string; nama: string; latar: Latar }[] = [
  { id: "titik-merah-muda", nama: "Titik merah muda", latar: { jenis: "halftone", warna1: "#f472d0", warna2: "#d81b9b", ukuran: 22, sudut: 45 } },
  { id: "titik-merah", nama: "Titik merah", latar: { jenis: "halftone", warna1: "#f0553a", warna2: "#c2301d", ukuran: 24, sudut: 45 } },
  { id: "titik-hijau", nama: "Titik hijau", latar: { jenis: "halftone", warna1: "#7ed957", warna2: "#4fb23a", ukuran: 24, sudut: 45 } },
  { id: "titik-pudar-tosca", nama: "Titik memudar tosca", latar: { jenis: "halftone-pudar", warna1: "#58c4d6", warna2: "#2f9bb5", ukuran: 18, sudut: 270 } },
  { id: "sinar-biru", nama: "Sinar biru", latar: { jenis: "sinar", warna1: "#2c8be0", warna2: "#5fb1f2", ukuran: 32, sudut: 0 } },
  { id: "sinar-oranye", nama: "Sinar oranye", latar: { jenis: "sinar", warna1: "#f08a2c", warna2: "#f6a94d", ukuran: 36, sudut: 0 } },
  { id: "sinar-kuning", nama: "Sinar kuning", latar: { jenis: "sinar", warna1: "#ffd93b", warna2: "#f7b733", ukuran: 28, sudut: 0 } },
  { id: "garis-miring", nama: "Garis miring", latar: { jenis: "garis", warna1: "#ffffff", warna2: "#e6ebf0", ukuran: 30, sudut: 45 } },
  { id: "gradasi-langit", nama: "Gradasi langit", latar: { jenis: "gradasi", warna1: "#bfe3ff", warna2: "#ffffff", ukuran: 0, sudut: 90 } },
  { id: "gradasi-senja", nama: "Gradasi senja", latar: { jenis: "gradasi", warna1: "#ffd1a8", warna2: "#ff8fb1", ukuran: 0, sudut: 90 } },
  { id: "krem", nama: "Krem polos", latar: { jenis: "polos", warna1: "#fff6dc", warna2: "#fff6dc", ukuran: 0, sudut: 0 } },
  { id: "biru-muda", nama: "Biru muda polos", latar: { jenis: "polos", warna1: "#dff1ff", warna2: "#dff1ff", ukuran: 0, sudut: 0 } },
];

/** Latar baru dengan jenis berbeda, mempertahankan warna dan sudut yang sudah ada, dan ukuran bawaan jenisnya. */
export function gantiJenisLatar(lama: Latar | null, jenis: JenisLatar): Latar {
  const aturan = aturanUkuran(jenis);
  return {
    jenis,
    warna1: lama?.warna1 ?? "#ffffff",
    warna2: lama?.warna2 ?? "#e6ebf0",
    ukuran: aturan ? aturan.bawaan : 0,
    sudut: lama?.sudut ?? 45,
  };
}

const rad = (derajat: number) => (derajat * Math.PI) / 180;

export type Titik = { x: number; y: number };
export type Lingkaran = { x: number; y: number; r: number };

/** Batas jumlah titik agar panel besar dengan jarak kecil tidak membuat penggambaran lambat. */
export const MAKS_TITIK = 40_000;

/**
 * Titik halftone yang memenuhi panel. Halftone biasa: kisi miring `sudut` derajat, titik berukuran sama.
 * Memudar: kisi tetap 45 derajat, ukuran titik membesar dari kecil ke besar searah `sudut` (efek halftone khas komik).
 */
export function titikHalftone(w: number, h: number, jarak: number, sudut: number, pudar: boolean): Lingkaran[] {
  const langkah = Math.max(4, jarak);
  const kisi = rad(pudar ? 45 : sudut);
  const cos = Math.cos(kisi);
  const sin = Math.sin(kisi);
  const arah = { x: Math.cos(rad(sudut)), y: Math.sin(rad(sudut)) };
  const cx = w / 2;
  const cy = h / 2;
  // sebaran sepanjang arah pudar, untuk menormalkan ukuran titik 0..1
  const jangkau = (Math.abs(w * arah.x) + Math.abs(h * arah.y)) / 2 || 1;
  const radiusMaks = langkah * 0.5; // titik terbesar nyaris bersentuhan
  const radiusTetap = langkah * 0.32;
  const separuh = Math.ceil(Math.hypot(w, h) / langkah / 2) + 1;
  const hasil: Lingkaran[] = [];
  for (let i = -separuh; i <= separuh; i++) {
    for (let j = -separuh; j <= separuh; j++) {
      const u = i * langkah;
      const v = j * langkah;
      const x = cx + u * cos - v * sin;
      const y = cy + u * sin + v * cos;
      let r = radiusTetap;
      if (pudar) {
        const t = Math.min(1, Math.max(0, ((x - cx) * arah.x + (y - cy) * arah.y) / jangkau / 2 + 0.5));
        r = radiusMaks * (0.08 + 0.92 * t);
      }
      // hanya titik yang menyentuh panel
      if (x + r < 0 || x - r > w || y + r < 0 || y - r > h) continue;
      hasil.push({ x, y, r });
      if (hasil.length >= MAKS_TITIK) return hasil;
    }
  }
  return hasil;
}

/** Irisan sinar warna kedua: dari pusat panel, `jumlah` sinar bergantian dengan celah selebar yang sama. */
export function irisanSinar(jumlah: number, sudutAwal: number): { dari: number; ke: number }[] {
  const n = Math.max(1, Math.round(jumlah));
  const lebar = (Math.PI * 2) / n;
  return Array.from({ length: n }, (_, i) => ({ dari: rad(sudutAwal) + i * lebar, ke: rad(sudutAwal) + i * lebar + lebar / 2 }));
}

/** Jari-jari yang pasti menutup panel dari pusatnya. */
export const jariSinar = (w: number, h: number) => Math.hypot(w, h) / 2 + 2;

/** Garis-garis warna kedua sebagai jajaran genjang (4 titik), miring `sudut` derajat dan selebar `lebar`, memenuhi panel. */
export function jajaranGaris(w: number, h: number, lebar: number, sudut: number): Titik[][] {
  const l = Math.max(2, lebar);
  const arah = { x: Math.cos(rad(sudut)), y: Math.sin(rad(sudut)) }; // tegak lurus garis: urutan garis menjalar searah ini
  const sepanjang = { x: -arah.y, y: arah.x }; // sepanjang garis
  const cx = w / 2;
  const cy = h / 2;
  const panjang = Math.hypot(w, h);
  const separuh = Math.ceil(panjang / l / 2) + 1;
  const hasil: Titik[][] = [];
  for (let i = -separuh; i <= separuh; i += 2) {
    const a = i * l;
    const b = a + l;
    const pt = (jarak: number, sisi: number) => ({ x: cx + arah.x * jarak + sepanjang.x * sisi, y: cy + arah.y * jarak + sepanjang.y * sisi });
    hasil.push([pt(a, -panjang), pt(a, panjang), pt(b, panjang), pt(b, -panjang)]);
  }
  return hasil;
}

/** Titik awal dan akhir gradasi linear melintasi seluruh panel searah `sudut`. */
export function titikGradasi(w: number, h: number, sudut: number): { mulai: Titik; akhir: Titik } {
  const arah = { x: Math.cos(rad(sudut)), y: Math.sin(rad(sudut)) };
  const separuh = (Math.abs(w * arah.x) + Math.abs(h * arah.y)) / 2;
  const cx = w / 2;
  const cy = h / 2;
  return { mulai: { x: cx - arah.x * separuh, y: cy - arah.y * separuh }, akhir: { x: cx + arah.x * separuh, y: cy + arah.y * separuh } };
}

/**
 * Perkiraan CSS pola untuk thumbnail (tanpa kanvas). Ukuran dinyatakan dalam persen lebar panel agar ikut mengecil bersama thumbnail.
 * Hanya pendekatan visual; gambar sebenarnya memakai penggambaran di atas.
 */
export function cssLatar(latar: Latar, w: number, h: number): { backgroundColor: string; backgroundImage?: string; backgroundSize?: string } {
  const dasar = { backgroundColor: latar.warna1 };
  switch (latar.jenis) {
    case "halftone":
    case "halftone-pudar": {
      const sel = Math.max(4, latar.ukuran);
      return {
        ...dasar,
        backgroundImage: `radial-gradient(circle at center, ${latar.warna2} 30%, transparent 33%)`,
        backgroundSize: `${(sel / w) * 100}% ${(sel / h) * 100}%`,
      };
    }
    case "sinar":
      return { ...dasar, backgroundImage: `repeating-conic-gradient(from ${latar.sudut}deg at 50% 50%, ${latar.warna2} 0deg ${180 / Math.max(1, latar.ukuran)}deg, ${latar.warna1} ${180 / Math.max(1, latar.ukuran)}deg ${360 / Math.max(1, latar.ukuran)}deg)` };
    case "garis": {
      const lebarPersen = Math.max(1, (latar.ukuran / Math.hypot(w, h)) * 100);
      return { ...dasar, backgroundImage: `repeating-linear-gradient(${latar.sudut + 90}deg, ${latar.warna1} 0 ${lebarPersen}%, ${latar.warna2} ${lebarPersen}% ${lebarPersen * 2}%)` };
    }
    case "gradasi":
      return { backgroundColor: latar.warna1, backgroundImage: `linear-gradient(${latar.sudut + 90}deg, ${latar.warna1}, ${latar.warna2})` };
    default:
      return dasar;
  }
}
