import type { Tokoh } from "@/lib/comics/tokoh";

/** Tokoh buatan guru dari komiknya yang lain, untuk dipakai ulang. */
export type TokohLama = { comicId: string; judulKomik: string; tokoh: Tokoh };

export const MAKS_TOKOH_LAMA = 12;

/**
 * Susun daftar tokoh dari komik-komik lain milik guru (komik terbaru lebih dulu): hanya tokoh buatan sendiri (preset
 * sudah tersedia di daftar siap pakai), satu per nama, dan dibatasi jumlahnya.
 */
export function kumpulkanTokohLama(komik: { id: string; judul: string; tokoh_json: unknown }[], exclude: string): TokohLama[] {
  const sudah = new Set<string>();
  const hasil: TokohLama[] = [];
  for (const k of komik) {
    if (k.id === exclude || !Array.isArray(k.tokoh_json)) continue;
    for (const t of k.tokoh_json as Tokoh[]) {
      if (!t || typeof t.id !== "string" || typeof t.nama !== "string" || typeof t.deskripsi !== "string" || t.preset) continue;
      const kunci = t.nama.trim().toLowerCase();
      if (!kunci || sudah.has(kunci)) continue;
      sudah.add(kunci);
      hasil.push({ comicId: k.id, judulKomik: k.judul, tokoh: t });
      if (hasil.length >= MAKS_TOKOH_LAMA) return hasil;
    }
  }
  return hasil;
}
