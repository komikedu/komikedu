export type PageImageRequest = {
  /** Deskripsi adegan per panel, urut sesuai template layout. Tanpa teks di gambar. */
  panels: { adegan: string; karakter: string[] }[];
  /** id template di layouts.ts */
  layoutId: string;
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
