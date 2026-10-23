import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { ambilKunci, syaratKunciBebas } from "@/lib/comics/kunci-generate";
import { catatVersi } from "@/lib/comics/versi-gambar";
import { simpanGambar } from "@/lib/storage/gambar";

export const MAX_UNGGAH_PANEL_BYTES = 8 * 1024 * 1024;
const SISI_MAKS = 2048;

export type UnggahPanelResult = { ok: true; imageUrl: string } | { ok: false; error: string; status: number };

/**
 * Pasang gambar unggahan guru (mis. hasil Google Flow) ke sebuah panel, gratis tanpa kredit. Isi berkas diperiksa
 * (bukan hanya tipenya), dikecilkan ke sisi terpanjang 2048 px, disimpan sebagai WebP, dan dicatat di riwayat
 * versi supaya bisa dipasang kembali. Memakai kunci yang sama dengan pembuatan gambar agar tidak bentrok.
 */
export async function unggahGambarPanel(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
  comicId: string,
  panelId: string,
  bytes: Uint8Array,
): Promise<UnggahPanelResult> {
  if (bytes.length === 0 || bytes.length > MAX_UNGGAH_PANEL_BYTES) return { ok: false, error: "Ukuran gambar maksimal 8 MB", status: 400 };

  const { data: panel } = await supabase
    .from("panels")
    .select("id, status, pages!inner(comic_id)")
    .eq("id", panelId)
    .eq("pages.comic_id", comicId)
    .maybeSingle();
  if (!panel) return { ok: false, error: "Panel tidak ditemukan", status: 404 };

  const meta = await sharp(bytes).metadata().catch(() => null);
  if (!meta?.format || !["jpeg", "png", "webp"].includes(meta.format) || !meta.width || !meta.height) {
    return { ok: false, error: "Gambar harus berformat JPG, PNG, atau WebP", status: 400 };
  }
  if (meta.width * meta.height > 40_000_000) return { ok: false, error: "Resolusi gambar terlalu besar", status: 400 };

  const { data: klaim } = await admin.from("panels").update(ambilKunci()).eq("id", panelId).or(syaratKunciBebas()).select("id");
  if (!klaim?.length) return { ok: false, error: "Gambar panel ini sedang dibuat", status: 409 };

  try {
    const gambar = await sharp(bytes)
      .rotate()
      .resize({ width: SISI_MAKS, height: SISI_MAKS, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer();
    const imageUrl = await simpanGambar(admin, `${userId}/${comicId}/${panelId}-unggah-${Date.now()}.webp`, gambar, "image/webp");
    const { error } = await admin.from("panels").update({ image_url: imageUrl, status: "selesai" }).eq("id", panelId);
    if (error) throw error;
    await catatVersi(admin, panelId, imageUrl, "unggah");
    return { ok: true, imageUrl };
  } catch (e) {
    console.error("unggahGambarPanel gagal", panelId, e);
    await admin.from("panels").update({ status: panel.status }).eq("id", panelId);
    return { ok: false, error: "Gagal menyimpan gambar. Coba lagi.", status: 500 };
  }
}
