/** Galat 429 dari Gemini: kuota atau batas belanja bulanan proyek habis. Mencoba ulang tidak membantu. */
export function kuotaHabis(e: unknown): boolean {
  if ((e as { status?: number } | null)?.status === 429) return true;
  const pesan = e instanceof Error ? e.message : "";
  return /RESOURCE_EXHAUSTED|spending cap|"code":\s*429/i.test(pesan);
}

export const PESAN_KUOTA = "Layanan pembuat gambar sedang tidak tersedia karena batas pemakaian AI sudah tercapai. Kredit sudah dikembalikan. Coba lagi nanti atau hubungi admin.";
