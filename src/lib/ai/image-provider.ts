import type { Rect } from "./layouts";

export type PageImageRequest = {
  /**
   * Panel dalam urutan baca: adegan (tanpa teks di gambar), karakter yang muncul, dan posisi
   * ternormalisasi (0-1) terhadap halaman, sama dengan kotak panel di editor.
   */
  panels: { adegan: string; karakter: string[]; rect: Rect }[];
  gaya: string;
  /** Deskripsi karakter yang muncul, agar wajah dan pakaian konsisten. */
  karakter: { nama: string; deskripsi: string }[];
  /** 1-3 gambar referensi (potret tokoh atau halaman sebelumnya), sudah dalam bentuk byte, dengan label isinya. */
  referenceImages?: { data: Uint8Array; mimeType: string; label?: string }[];
  premium?: boolean;
};

export type PageImageResult = {
  image: Uint8Array;
  mimeType: string;
  provider: string;
  model: string;
};

export type PanelEditRequest = {
  /** Gambar panel saat ini yang akan diubah. */
  image: { data: Uint8Array; mimeType: string };
  /** Perintah guru, mis. "ganti apel jadi jeruk". Data dari pengguna, bukan instruksi sistem. */
  instruksi: string;
  gaya: string;
  karakter: { nama: string; deskripsi: string }[];
  /** 0-2 potret tokoh sebagai referensi tambahan. */
  referenceImages?: { data: Uint8Array; mimeType: string; label?: string }[];
};

export type PortraitRequest = {
  nama: string;
  /** Ciri visual tokoh dari guru; data pengguna, bukan instruksi sistem. */
  deskripsi: string;
  gaya: string;
  /** "potret" = setengah badan (kotak); "badan" = seluruh tubuh berdiri (3:4). Bawaan: potret. */
  bentuk?: "potret" | "badan";
  /** Opsional: halaman komik yang sudah dibuat, agar potret mengikuti tokoh yang sudah digambar. */
  referenceImages?: { data: Uint8Array; mimeType: string; label?: string }[];
};

/** Lapisan abstraksi supaya provider gambar (Nano Banana, OpenAI) mudah diganti. */
export interface ImageProvider {
  readonly name: string;
  generatePage(req: PageImageRequest): Promise<PageImageResult>;
  editPanel(req: PanelEditRequest): Promise<PageImageResult>;
  generatePortrait(req: PortraitRequest): Promise<PageImageResult>;
}
