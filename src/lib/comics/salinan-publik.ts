import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { z } from "zod";
import { simpanGambar } from "@/lib/storage/gambar";
import { MAX_HALAMAN_PUBLIK } from "./komunitas-schema";

/** Satu halaman salinan terbit paling besar 3 MB (halaman 1350 x 1800 JPEG biasanya 0,3 sampai 0,7 MB). */
export const MAX_BYTES_HALAMAN = 3 * 1024 * 1024;

export const RilisSchema = z.string().uuid();

/** Kunci objek halaman salinan terbit. `rilis` unik tiap penerbitan, jadi menerbitkan ulang tidak menimpa salinan yang sedang dibaca. */
export const kunciHalamanRilis = (userId: string, comicId: string, rilis: string, nomor: number) => `${userId}/${comicId}/rilis-${rilis}-${nomor}.jpg`;

/** Pemeriksaan isi gambar halaman: harus JPEG berukuran wajar dengan rasio 3:4. Mengembalikan pesan galat, atau null bila valid. */
export function galatHalamanJpeg(meta: { format?: string; width?: number; height?: number } | null): string | null {
  if (!meta?.format || meta.format !== "jpeg") return "Halaman harus berupa gambar JPEG";
  const { width, height } = meta;
  if (!width || !height || width < 600 || width > 2400 || height < 800 || height > 3200) return "Ukuran gambar halaman tidak wajar";
  const rasio = width / height;
  if (rasio < 0.73 || rasio > 0.77) return "Rasio halaman harus 3:4";
  return null;
}

export type SalinanResult = { ok: true } | { ok: false; error: string; status: number };

/**
 * Simpan satu halaman salinan terbit dari browser. Isinya dicek (bukan hanya tipenya) dan kepemilikan komik dijaga
 * lewat klien pengguna. Berkas baru baru dipakai setelah komik benar-benar diterbitkan (`terbitkanKomik`).
 */
export async function simpanHalamanRilis(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
  comicId: string,
  rilis: string,
  nomor: number,
  bytes: Uint8Array,
): Promise<SalinanResult> {
  if (!RilisSchema.safeParse(rilis).success) return { ok: false, error: "Permintaan tidak valid", status: 400 };
  if (!Number.isInteger(nomor) || nomor < 1 || nomor > MAX_HALAMAN_PUBLIK) return { ok: false, error: "Nomor halaman tidak valid", status: 400 };
  if (bytes.length === 0 || bytes.length > MAX_BYTES_HALAMAN) return { ok: false, error: "Ukuran gambar halaman maksimal 3 MB", status: 413 };
  const { data: komik } = await supabase.from("comics").select("id, user_id").eq("id", comicId).maybeSingle();
  if (!komik || komik.user_id !== userId) return { ok: false, error: "Komik tidak ditemukan", status: 404 };
  const galat = galatHalamanJpeg(await sharp(bytes).metadata().catch(() => null));
  if (galat) return { ok: false, error: galat, status: 400 };
  try {
    await simpanGambar(admin, kunciHalamanRilis(userId, comicId, rilis, nomor), bytes, "image/jpeg");
    return { ok: true };
  } catch (e) {
    console.error("simpanHalamanRilis gagal", comicId, nomor, e);
    return { ok: false, error: "Gagal menyimpan halaman. Coba lagi.", status: 500 };
  }
}
