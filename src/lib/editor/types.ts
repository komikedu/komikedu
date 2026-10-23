/** Ukuran halaman dalam unit kanvas (rasio 3:4). Semua koordinat editor memakai unit ini. */
export const PAGE_W = 900;
export const PAGE_H = 1200;

export type BubbleKind = "bicara" | "pikir" | "narasi";

/** Bentuk garis tepi balon (lihat bentuk-balon.ts). Kosong = bentuk bawaan menurut jenisnya. Tidak berlaku untuk narasi. */
export type BentukBalon = "oval" | "kotak" | "awan" | "ledakan" | "teriak" | "gerak";

export type Bubble = {
  id: string;
  panelId: string;
  kind: BubbleKind;
  bentuk?: BentukBalon;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Ujung ekor relatif terhadap pusat balon, dan `lebar` pangkalnya sepanjang tepi balon (kosong = bawaan). null = tanpa ekor. */
  tail: { dx: number; dy: number; lebar?: number } | null;
  fontSize: number;
  visible: boolean;
};

export type Point = { x: number; y: number };

/** Jenis pola latar panel (lihat latar-panel.ts). */
export type JenisLatar = "polos" | "halftone" | "halftone-pudar" | "sinar" | "garis" | "gradasi";

/**
 * Latar panel bergaya komik, tampak di balik gambar (untuk panel kosong atau gambar transparan).
 * `ukuran`: jarak titik, jumlah sinar, atau lebar garis menurut jenis (0 bila tidak dipakai). `sudut` dalam derajat.
 */
export type Latar = { jenis: JenisLatar; warna1: string; warna2: string; ukuran: number; sudut: number };

export type Panel = {
  id: string;
  /** Kotak pembatas panel. Untuk panel miring, kotak ini membungkus keempat sudutnya. */
  x: number;
  y: number;
  w: number;
  h: number;
  /**
   * Sudut panel miring (koordinat halaman, urutan kiri-atas, kanan-atas, kanan-bawah, kiri-bawah).
   * Kosong = panel kotak biasa.
   */
  corners?: Point[] | null;
  imageUrl: string | null;
  /**
   * Posisi dan ukuran gambar (koordinat halaman) bila guru menggeser atau mengubah ukurannya.
   * Kosong = gambar otomatis memenuhi panel (seperti object-fit: cover).
   */
  imageRect?: { x: number; y: number; w: number; h: number } | null;
  /** Pola latar panel; kosong = tanpa pola (abu-abu muda bawaan). */
  latar?: Latar | null;
  visible: boolean;
  /** Deskripsi adegan dari naskah yang sudah disetujui. */
  adegan: string;
  /**
   * Panel ini salinan panel lain yang bergambar: server menyalin gambarnya saat menyimpan.
   * Hanya sementara di klien; tidak ada di data yang dimuat dari database.
   */
  salinanDari?: string;
};

export type IkonBenda = "apel" | "jeruk" | "kue" | "bintang" | "kelereng" | "pensil";

/**
 * Bagian yang sama pada semua elemen di atas halaman. `rotasi` dalam derajat searah jarum jam, berputar di pojok kiri-atas.
 * `panelId` null = elemen bebas: tidak terikat panel (tidak ikut pindah, tersalin, atau terhapus bersama panel).
 */
type ElemenDasar = {
  id: string;
  panelId: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  rotasi?: number;
  visible: boolean;
};

/**
 * Elemen matematika yang digambar dari data (bukan oleh AI), sehingga angkanya pasti benar.
 * "kumpulan" = sejumlah benda yang sama, mis. 10 apel disusun 5 per baris.
 */
export type ElemenKumpulan = ElemenDasar & {
  kind: "kumpulan";
  ikon: IkonBenda;
  jumlah: number;
  kolom: number;
};

/** Teks bergaya komik (judul, efek suara) dengan huruf dan garis tepi dari pustaka gaya (gaya-teks.ts). */
export type ElemenTeks = ElemenDasar & {
  kind: "teks";
  text: string;
  gaya: string;
  fontSize: number;
  /** Warna isi huruf pengganti; kosong = warna bawaan gaya. */
  warna?: string;
  /** Latar burst di belakang teks; kosong = ikut bawaan gaya. */
  latarBurst?: boolean;
  /** Pengaturan lanjutan; kosong = bawaan gaya. Ukuran dalam satuan "per huruf 100", jadi ikut membesar dan mengecil bersama huruf. */
  /** Pengali tebal garis tepi (1 = bawaan gaya). */
  tebalTepi?: number;
  /** Warna garis tepi terluar. */
  warnaTepi?: string;
  /** Jarak bayangan keras ke kanan-bawah; 0 = tanpa bayangan. */
  bayanganJarak?: number;
  /** Tebal bayangan (seberapa melebar dari huruf). */
  bayanganTebal?: number;
  warnaBayangan?: string;
};

/** Gambar karakter (atau benda) bebas, mis. hasil hapus latar. `url` harus gambar milik komik ini; digambar muat utuh di kotaknya. */
export type ElemenStiker = ElemenDasar & {
  kind: "stiker";
  url: string;
};

export type MathElement = ElemenKumpulan | ElemenTeks | ElemenStiker;

export type EditorPage = {
  id: string;
  layoutId: string;
  panels: Panel[];
  bubbles: Bubble[];
  elements: MathElement[];
};
