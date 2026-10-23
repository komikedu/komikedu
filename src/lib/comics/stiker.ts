import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { simpanGambar } from "@/lib/storage/gambar";

export const MAX_STIKER_BYTES = 8 * 1024 * 1024;
const SISI_MAKS = 1536;

export type StikerResult = { ok: true; url: string } | { ok: false; error: string; status: number };

/**
 * Simpan gambar stiker (biasanya karakter tanpa latar) ke folder komik ini. Isi berkas diperiksa (bukan hanya tipenya),
 * dikecilkan ke sisi terpanjang 1536 px, dan disimpan sebagai WebP dengan latar transparan dipertahankan.
 * Hanya pemilik komik yang boleh menyimpan.
 */
export async function simpanStiker(supabase: SupabaseClient, admin: SupabaseClient, userId: string, comicId: string, bytes: Uint8Array): Promise<StikerResult> {
  if (bytes.length === 0 || bytes.length > MAX_STIKER_BYTES) return { ok: false, error: "Ukuran gambar maksimal 8 MB", status: 400 };
  const { data: comic } = await supabase.from("comics").select("id").eq("id", comicId).eq("user_id", userId).maybeSingle();
  if (!comic) return { ok: false, error: "Komik tidak ditemukan", status: 404 };

  const meta = await sharp(bytes).metadata().catch(() => null);
  if (!meta?.format || !["jpeg", "png", "webp"].includes(meta.format) || !meta.width || !meta.height) {
    return { ok: false, error: "Gambar harus berformat JPG, PNG, atau WebP", status: 400 };
  }
  if (meta.width * meta.height > 40_000_000) return { ok: false, error: "Resolusi gambar terlalu besar", status: 400 };

  try {
    const gambar = await sharp(bytes).rotate().resize({ width: SISI_MAKS, height: SISI_MAKS, fit: "inside", withoutEnlargement: true }).webp({ quality: 90 }).toBuffer();
    const url = await simpanGambar(admin, `${userId}/${comicId}/stiker-${Date.now()}.webp`, gambar, "image/webp");
    return { ok: true, url };
  } catch (e) {
    console.error("simpanStiker gagal", comicId, e);
    return { ok: false, error: "Gagal menyimpan stiker. Coba lagi.", status: 500 };
  }
}
