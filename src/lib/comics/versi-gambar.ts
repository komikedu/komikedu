import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SumberVersi = "halaman" | "edit" | "salinan" | "unggah" | "tanpa-latar";
export type VersiGambar = { id: string; url: string; sumber: SumberVersi; dibuat: string };

export type VersiResult<T = object> = ({ ok: true } & T) | { ok: false; error: string; status: number };

/**
 * Catat gambar yang baru dipakai sebuah panel sebagai versi terbaru. Tidak ada versi yang dibuang: semua gambar
 * yang pernah dipakai tetap ada di riwayat (dan berkasnya di penyimpanan) sampai komiknya dihapus.
 * Gagal mencatat tidak menggagalkan pembuatan gambar (hanya riwayatnya yang hilang).
 */
export async function catatVersi(admin: SupabaseClient, panelId: string, url: string, sumber: SumberVersi): Promise<void> {
  try {
    const { error } = await admin.from("panel_images").insert({ panel_id: panelId, image_url: url, sumber });
    if (error) throw error;
  } catch (e) {
    console.error("catatVersi gagal", panelId, e);
  }
}

/** Panel milik komik ini? Pemeriksaan lewat klien pengguna, jadi RLS ikut membatasi ke pemilik. */
async function panelMilik(supabase: SupabaseClient, comicId: string, panelId: string): Promise<boolean> {
  const { data } = await supabase.from("panels").select("id, pages!inner(comic_id)").eq("id", panelId).eq("pages.comic_id", comicId).maybeSingle();
  return !!data;
}

/** Daftar versi gambar sebuah panel, dari yang paling lama ke terbaru. */
export async function daftarVersi(supabase: SupabaseClient, comicId: string, panelId: string): Promise<VersiResult<{ versi: VersiGambar[] }>> {
  if (!(await panelMilik(supabase, comicId, panelId))) return { ok: false, error: "Panel tidak ditemukan", status: 404 };
  const { data, error } = await supabase.from("panel_images").select("id, image_url, sumber, created_at").eq("panel_id", panelId).order("created_at", { ascending: true });
  if (error) return { ok: false, error: "Gagal membaca riwayat gambar", status: 500 };
  return { ok: true, versi: (data ?? []).map((v) => ({ id: v.id, url: v.image_url, sumber: v.sumber as SumberVersi, dibuat: v.created_at })) };
}

/** Jadikan salah satu versi sebagai gambar panel saat ini. image_url hanya boleh ditulis server. */
export async function pilihVersi(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  comicId: string,
  panelId: string,
  versiId: string,
): Promise<VersiResult<{ url: string }>> {
  if (!(await panelMilik(supabase, comicId, panelId))) return { ok: false, error: "Panel tidak ditemukan", status: 404 };
  const { data: versi } = await supabase.from("panel_images").select("id, image_url").eq("id", versiId).eq("panel_id", panelId).maybeSingle();
  if (!versi) return { ok: false, error: "Versi gambar tidak ditemukan", status: 404 };
  const { error } = await admin.from("panels").update({ image_url: versi.image_url, status: "selesai" }).eq("id", panelId);
  if (error) return { ok: false, error: "Gagal mengganti gambar", status: 500 };
  return { ok: true, url: versi.image_url };
}
