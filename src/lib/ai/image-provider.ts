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
  /** 1-3 gambar referensi karakter (character sheet), sudah dalam bentuk byte. */
  referenceImages?: { data: Uint8Array; mimeType: string }[];
  premium?: boolean;
};

export type PageImageResult = {
  image: Uint8Array;
  mimeType: string;
  provider: string;
  model: string;
};

/** Lapisan abstraksi supaya provider gambar (Nano Banana, OpenAI) mudah diganti. */
export interface ImageProvider {
  readonly name: string;
  generatePage(req: PageImageRequest): Promise<PageImageResult>;
}
