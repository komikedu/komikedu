import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tokoh } from "@/lib/comics/tokoh";

export type JenisGaleri = "potret" | "badan";
export type SumberGaleri = "ai" | "unggah";
export type GaleriItem = { id: string; url: string; sumber: SumberGaleri; dibuat: string };

export type GaleriResult<T = object> = ({ ok: true } & T) | { ok: false; error: string; status: number };

/**
 * Catat gambar tokoh ke galeri. Tidak ada yang dibuang: potret dan badan penuh lama tetap bisa dipasang lagi
 * sampai komiknya dihapus. Gagal mencatat tidak menggagalkan pembuatan gambar.
 */
export async function catatGaleriTokoh(admin: SupabaseClient, comicId: string, tokohId: string, jenis: JenisGaleri, url: string, sumber: SumberGaleri): Promise<void> {
  try {
    const { error } = await admin.from("tokoh_images").insert({ comic_id: comicId, tokoh_id: tokohId, jenis, image_url: url, sumber });
    if (error) throw error;
  } catch (e) {
    console.error("catatGaleriTokoh gagal", tokohId, jenis, e);
  }
}

/** Galeri satu jenis gambar sebuah tokoh, dari yang terbaru. Dibaca lewat klien pengguna, jadi RLS membatasi ke pemilik. */
export async function daftarGaleriTokoh(supabase: SupabaseClient, comicId: string, tokohId: string, jenis: JenisGaleri): Promise<GaleriResult<{ gambar: GaleriItem[] }>> {
  const { data, error } = await supabase
    .from("tokoh_images")
    .select("id, image_url, sumber, created_at")
    .eq("comic_id", comicId)
    .eq("tokoh_id", tokohId)
    .eq("jenis", jenis)
    .order("created_at", { ascending: false });
  if (error) return { ok: false, error: "Gagal membaca galeri", status: 500 };
  return { ok: true, gambar: (data ?? []).map((g) => ({ id: g.id, url: g.image_url, sumber: g.sumber as SumberGaleri, dibuat: g.created_at })) };
}

/**
 * Pasang gambar dari galeri sebagai potret atau badan penuh tokoh saat ini. Alamat gambar diambil dari baris galeri
 * (ditulis server), bukan dari klien. Tidak memakai kredit.
 */
export async function pasangGambarTokoh(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  comicId: string,
  tokohId: string,
  gambarId: string,
): Promise<GaleriResult<{ tokoh: Tokoh[] }>> {
  const { data: g } = await supabase.from("tokoh_images").select("id, jenis, image_url").eq("id", gambarId).eq("comic_id", comicId).eq("tokoh_id", tokohId).maybeSingle();
  if (!g) return { ok: false, error: "Gambar tidak ditemukan di galeri", status: 404 };

  const { data: comic } = await admin.from("comics").select("tokoh_json").eq("id", comicId).single();
  const daftar = (comic?.tokoh_json as Tokoh[] | null) ?? [];
  const tokoh = daftar.find((t) => t.id === tokohId);
  if (!tokoh) return { ok: false, error: "Tokoh tidak ditemukan", status: 404 };
  if (g.jenis === "potret" && tokoh.preset) return { ok: false, error: "Potret tokoh siap pakai tidak bisa diganti", status: 400 };

  const baru = daftar.map((t) => (t.id === tokohId ? { ...t, [g.jenis]: g.image_url } : t));
  const { error } = await admin.from("comics").update({ tokoh_json: baru }).eq("id", comicId);
  if (error) return { ok: false, error: "Gagal memasang gambar", status: 500 };
  return { ok: true, tokoh: baru };
}
