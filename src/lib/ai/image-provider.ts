export type PageImageRequest = {
  /** Deskripsi adegan per panel, urut sesuai template layout. Tanpa teks di gambar. */
  panels: { adegan: string; karakter: string[] }[];
  layoutTemplate: string;
  gaya: string;
  /** 1-3 gambar referensi karakter (character sheet). */
  referenceImageUrls: string[];
  premium?: boolean;
};

export type PageImageResult = {
  image: Uint8Array;
  mimeType: string;
  provider: string;
  costUsd?: number;
};

/** Lapisan abstraksi supaya provider gambar (Nano Banana, OpenAI) mudah diganti. */
export interface ImageProvider {
  readonly name: string;
  generatePage(req: PageImageRequest): Promise<PageImageResult>;
}
