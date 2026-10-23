import type { BentukBalon } from "./types";

/**
 * Bentuk balon dialog bergaya komik. Semua geometri dihitung dengan kode (bukan gambar), jadi tajam di semua ukuran
 * dan sama persis di editor, PDF, dan salinan terbit. Koordinat relatif terhadap pojok kiri-atas balon (lebar w, tinggi h).
 */
export const BENTUK_BALON: { id: BentukBalon; nama: string; /** jenis balon yang cocok saat bentuk ini dipilih */ jenis: "bicara" | "pikir" }[] = [
  { id: "oval", nama: "Oval", jenis: "bicara" },
  { id: "kotak", nama: "Kotak bayangan", jenis: "bicara" },
  { id: "awan", nama: "Awan pikiran", jenis: "pikir" },
  { id: "ledakan", nama: "Ledakan", jenis: "bicara" },
  { id: "teriak", nama: "Teriakan", jenis: "bicara" },
  { id: "gerak", nama: "Oval bergerak", jenis: "bicara" },
];

export const namaBentuk = (id: BentukBalon) => BENTUK_BALON.find((b) => b.id === id)?.nama ?? id;

export type Titik = { x: number; y: number };

/** Bintang bergerigi yang memenuhi kotak: `n` ujung, lekuk di `dalam` (0..1) kali jari-jari, panjang ujung sedikit tidak rata. */
export function titikGerigi(w: number, h: number, n: number, dalam: number): Titik[] {
  const jumlah = Math.max(6, Math.min(40, Math.round(n)));
  const rx = w / 2;
  const ry = h / 2;
  const hasil: Titik[] = [];
  for (let i = 0; i < jumlah * 2; i++) {
    const luar = i % 2 === 0;
    const sudut = (i * Math.PI) / jumlah - Math.PI / 2;
    const f = luar ? 1 - 0.12 * (((i * 7) % 5) / 4) : dalam + 0.06 * (((i * 5) % 3) / 2);
    hasil.push({ x: rx + Math.cos(sudut) * rx * f, y: ry + Math.sin(sudut) * ry * f });
  }
  return hasil;
}

/** Gumpalan awan: lingkaran-lingkaran mengelilingi tepi elips; isi tengah ditutup elips yang lebih kecil. */
export function lingkaranAwan(w: number, h: number): { lingkaran: { x: number; y: number; r: number }[]; tengah: { x: number; y: number; rx: number; ry: number } } {
  const n = Math.max(8, Math.min(18, Math.round((w + h) / 40)));
  const r = Math.min(w, h) * 0.17;
  const rx = w / 2 - r - 3;
  const ry = h / 2 - r - 3;
  const lingkaran = Array.from({ length: n }, (_, i) => {
    const a = (i * 2 * Math.PI) / n;
    return { x: w / 2 + Math.cos(a) * rx, y: h / 2 + Math.sin(a) * ry, r };
  });
  return { lingkaran, tengah: { x: w / 2, y: h / 2, rx: Math.max(1, rx), ry: Math.max(1, ry) } };
}

/** Garis gerak di sekitar sudut kiri-atas dan kanan-bawah oval, seperti tanda balon bergetar. */
export function garisGerak(w: number, h: number): [number, number, number, number][] {
  const garis: [number, number, number, number][] = [];
  for (const pusat of [Math.PI * 1.25, Math.PI * 0.25]) {
    for (let i = 0; i < 3; i++) {
      const a = pusat + (i - 1) * 0.3;
      const panjang = Math.min(w, h) * (0.16 - Math.abs(i - 1) * 0.04);
      const x1 = w / 2 + Math.cos(a) * (w / 2 + 6);
      const y1 = h / 2 + Math.sin(a) * (h / 2 + 6);
      garis.push([x1, y1, x1 + Math.cos(a) * panjang, y1 + Math.sin(a) * panjang]);
    }
  }
  return garis;
}

/** Bagian dalam balon yang aman untuk teks (kotak di tengah), menurut bentuknya. */
export function areaTeks(bentuk: BentukBalon | undefined, w: number, h: number): { x: number; y: number; w: number; h: number } {
  const f = bentuk === "ledakan" ? 0.6 : bentuk === "teriak" ? 0.56 : bentuk === "awan" ? 0.74 : bentuk === "gerak" ? 0.78 : bentuk === "kotak" ? 0.92 : 0.82;
  return { x: (w * (1 - f)) / 2, y: (h * (1 - f)) / 2, w: w * f, h: h * f };
}

/** Ukuran awal balon baru menurut bentuknya: bentuk bergerigi butuh ruang lebih agar teks tetap muat. */
export function ukuranBentuk(bentuk: BentukBalon | undefined, w: number, h: number): { w: number; h: number } {
  if (bentuk === "ledakan" || bentuk === "teriak") return { w: Math.max(w, 300), h: Math.max(h, 220) };
  if (bentuk === "awan") return { w: Math.max(w, 280), h: Math.max(h, 170) };
  return { w, h };
}

/** Lebar pangkal ekor bawaan (sepanjang tepi balon). */
export const LEBAR_EKOR_BAWAAN = 44;
export const LEBAR_EKOR_MIN = 10;
export const LEBAR_EKOR_MAX = 160;
export const PANJANG_EKOR_MIN = 10;
export const PANJANG_EKOR_MAX = 300;

/** Garis tepi oval sebagai banyak titik (searah jarum jam dari titik paling kanan). */
export function jalurOval(w: number, h: number, n = 96): Titik[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i * 2 * Math.PI) / n;
    return { x: w / 2 + (Math.cos(a) * w) / 2, y: h / 2 + (Math.sin(a) * h) / 2 };
  });
}

/** Garis tepi persegi panjang bersudut membulat sebagai banyak titik (searah jarum jam dari ujung kiri-atas). */
export function jalurKotak(w: number, h: number, radius = 22, seg = 8): Titik[] {
  const r = Math.max(1, Math.min(radius, w / 2, h / 2));
  const sudut: [number, number, number][] = [
    [r, r, Math.PI],
    [w - r, r, Math.PI * 1.5],
    [w - r, h - r, 0],
    [r, h - r, Math.PI * 0.5],
  ];
  return sudut.flatMap(([cx, cy, awal]) =>
    Array.from({ length: seg + 1 }, (_, i) => {
      const a = awal + (i * Math.PI) / 2 / seg;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
    }),
  );
}

/**
 * Sisipkan ekor ke garis tepi tertutup `poly` sehingga garis balon dan ekor menjadi SATU garis menyambung (bukan ekor yang
 * ditumpuk di atas balon). Ekor mengarah dari `pusat` ke `ujung`; pangkalnya selebar `lebar` sepanjang tepi, di tengah titik
 * tempat sinar pusat-ujung memotong tepi. Bila ujung masih di dalam balon, garis dikembalikan apa adanya.
 */
export function sisipkanEkor(poly: Titik[], pusat: Titik, ujung: Titik, lebar: number): Titik[] {
  const n = poly.length;
  const dx = ujung.x - pusat.x;
  const dy = ujung.y - pusat.y;
  if (n < 3 || Math.hypot(dx, dy) < 1e-6) return poly;

  const kum = [0];
  for (let i = 0; i < n; i++) kum.push(kum[i] + Math.hypot(poly[(i + 1) % n].x - poly[i].x, poly[(i + 1) % n].y - poly[i].y));
  const keliling = kum[n];

  // titik potong sinar dengan tepi (yang terjauh dari pusat), dan posisinya sepanjang keliling
  let t = -1;
  let s0 = 0;
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const tt = ((a.x - pusat.x) * ey - (a.y - pusat.y) * ex) / den;
    const u = ((a.x - pusat.x) * dy - (a.y - pusat.y) * dx) / den;
    if (tt > 1e-6 && u >= -1e-9 && u <= 1 + 1e-9 && tt > t) {
      t = tt;
      s0 = kum[i] + u * (kum[i + 1] - kum[i]);
    }
  }
  if (t < 0 || t >= 1) return poly; // t = 1 tepat di ujung; kurang dari 1 berarti ujung di luar tepi

  const separuh = Math.max(3, Math.min(lebar / 2, keliling * 0.2));
  const titikDi = (s: number): Titik => {
    const p = ((s % keliling) + keliling) % keliling;
    let i = 0;
    while (i < n - 1 && kum[i + 1] <= p) i++;
    const panjang = kum[i + 1] - kum[i] || 1;
    const u = (p - kum[i]) / panjang;
    const a = poly[i];
    const b = poly[(i + 1) % n];
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
  };

  const sB = s0 + separuh;
  const sA = s0 - separuh + keliling;
  const badan: { pos: number; p: Titik }[] = [];
  for (let k = 0; k < n; k++) {
    let pos = kum[k];
    while (pos <= sB) pos += keliling;
    if (pos < sA) badan.push({ pos, p: poly[k] });
  }
  badan.sort((x, y) => x.pos - y.pos);
  return [titikDi(sB), ...badan.map((b) => b.p), titikDi(sA), ujung];
}

/** Jari-jari tepi oval pada arah `sudut` (radian) dari pusat. */
function jariTepi(w: number, h: number, sudut: number): number {
  const rx = w / 2;
  const ry = h / 2;
  return (rx * ry) / Math.hypot(ry * Math.cos(sudut), rx * Math.sin(sudut));
}

/** Pengaturan ekor dalam bentuk yang mudah dipahami: arah (derajat 0..360, 0 = kanan, 90 = bawah) dan panjang dari tepi balon. */
export function aturanEkor(w: number, h: number, tail: { dx: number; dy: number; lebar?: number }): { arah: number; panjang: number; lebar: number } {
  const sudut = Math.atan2(tail.dy, tail.dx);
  const arah = ((Math.round((sudut * 180) / Math.PI) % 360) + 360) % 360;
  const panjang = Math.max(0, Math.round(Math.hypot(tail.dx, tail.dy) - jariTepi(w, h, sudut)));
  return { arah, panjang, lebar: tail.lebar ?? LEBAR_EKOR_BAWAAN };
}

/** Kebalikan `aturanEkor`: ekor baru dari arah, panjang dari tepi balon, dan lebar pangkal. */
export function ekorDariAturan(w: number, h: number, arah: number, panjang: number, lebar: number): { dx: number; dy: number; lebar: number } {
  const sudut = (arah * Math.PI) / 180;
  const jarak = jariTepi(w, h, sudut) + panjang;
  return { dx: Math.round(Math.cos(sudut) * jarak), dy: Math.round(Math.sin(sudut) * jarak), lebar };
}

/** Balik ekor ke sisi seberang secara mendatar (cermin kiri-kanan). */
export function balikEkor<T extends { dx: number; dy: number }>(tail: T): T {
  return { ...tail, dx: -tail.dx };
}
