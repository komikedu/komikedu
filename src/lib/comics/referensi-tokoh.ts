import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ambilGambar, kunciKomik } from "@/lib/storage/gambar";
import { gambarTokoh, isPresetId, type Tokoh } from "./tokoh";

export type GambarReferensi = { data: Uint8Array; mimeType: string; label: string };

/** Tokoh yang punya potret: preset (di /public) atau tokoh buatan sendiri yang sudah dibuatkan potret AI. */
export const punyaPotret = (t: Tokoh) => (t.preset && isPresetId(t.id)) || !!t.potret || !!t.badan;

/**
 * Ambil potret tokoh sebagai gambar referensi. Potret buatan AI diunduh lewat storage (bukan fetch URL),
 * dan hanya bila berada di folder komik ini, karena tokoh_json bisa ditulis klien.
 */
export async function potretTokoh(
  admin: SupabaseClient,
  userId: string,
  comicId: string,
  t: Tokoh,
  gaya: string | null,
  assetOrigin?: string,
): Promise<GambarReferensi | null> {
  const label = `potret tokoh ${t.nama}`;
  try {
    if (t.preset && isPresetId(t.id)) {
      if (!assetOrigin) return null;
      const r = await fetch(`${assetOrigin}${gambarTokoh(t.id, gaya)}`);
      return r.ok ? { data: new Uint8Array(await r.arrayBuffer()), mimeType: r.headers.get("content-type") ?? "image/webp", label } : null;
    }
    const url = t.potret ?? t.badan;
    if (!url || !kunciKomik(url, userId, comicId)) return null;
    const g = await ambilGambar(admin, url);
    return g ? { ...g, label } : null;
  } catch {
    return null; // referensi hanya membantu; gagal mengambil tidak menggagalkan pembuatan gambar
  }
}
