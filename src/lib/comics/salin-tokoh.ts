import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ambilGambar, kunciKomik, simpanGambar } from "@/lib/storage/gambar";
import { MAX_TOKOH, type Tokoh } from "@/lib/comics/tokoh";

export type SalinTokohResult = { ok: true; tokoh: Tokoh[] } | { ok: false; error: string; status: number };

/**
 * Pakai ulang tokoh buatan sendiri dari komik lain milik pengguna yang sama: ciri-ciri dan gambarnya (potret, badan
 * penuh) disalin ke penyimpanan komik ini, lalu tokoh ditambahkan ke daftar tokoh komik ini. Gratis.
 */
export async function salinTokoh(supabase: SupabaseClient, admin: SupabaseClient, userId: string, comicId: string, dariComicId: string, tokohId: string): Promise<SalinTokohResult> {
  if (dariComicId === comicId) return { ok: false, error: "Tokoh ini sudah ada di komik ini", status: 400 };
  const { data: baris } = await supabase.from("comics").select("id, user_id, tokoh_json").in("id", [comicId, dariComicId]);
  const tujuan = baris?.find((b) => b.id === comicId);
  const asal = baris?.find((b) => b.id === dariComicId);
  if (!tujuan || !asal || tujuan.user_id !== userId || asal.user_id !== userId) return { ok: false, error: "Komik tidak ditemukan", status: 404 };

  const sumber = ((asal.tokoh_json as Tokoh[] | null) ?? []).find((t) => t.id === tokohId && !t.preset);
  if (!sumber) return { ok: false, error: "Tokoh tidak ditemukan", status: 404 };
  const daftar = (tujuan.tokoh_json as Tokoh[] | null) ?? [];
  if (daftar.length >= MAX_TOKOH) return { ok: false, error: `Tokoh sudah mencapai batas ${MAX_TOKOH}`, status: 400 };
  if (daftar.some((t) => t.nama.trim().toLowerCase() === sumber.nama.trim().toLowerCase())) return { ok: false, error: "Sudah ada tokoh dengan nama itu di komik ini", status: 409 };

  const id = `lama-${crypto.randomUUID().slice(0, 8)}`;
  const baru: Tokoh = { id, nama: sumber.nama, peran: sumber.peran, deskripsi: sumber.deskripsi, preset: false };
  try {
    for (const jenis of ["potret", "badan"] as const) {
      const key = kunciKomik(sumber[jenis], userId, dariComicId);
      const gambar = key ? await ambilGambar(admin, sumber[jenis]!) : null;
      if (gambar) baru[jenis] = await simpanGambar(admin, `${userId}/${comicId}/tokoh-${id}-${jenis}-${Date.now()}.webp`, gambar.data, gambar.mimeType);
    }
  } catch (e) {
    // gambar gagal disalin: tokoh tetap dipakai tanpa gambar, guru bisa membuatnya lagi
    console.error("salinTokoh: salin gambar gagal", tokohId, e);
  }

  const hasil = [...daftar, baru];
  const { error } = await admin.from("comics").update({ tokoh_json: hasil }).eq("id", comicId);
  if (error) {
    console.error("salinTokoh gagal", error);
    return { ok: false, error: "Gagal memakai tokoh. Coba lagi.", status: 500 };
  }
  return { ok: true, tokoh: hasil };
}
