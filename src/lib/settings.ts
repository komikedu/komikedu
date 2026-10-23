import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

export const IMAGE_PROVIDERS = ["gemini", "cloudflare"] as const;
export type ImageProviderName = (typeof IMAGE_PROVIDERS)[number];

export const isImageProviderName = (v: unknown): v is ImageProviderName => IMAGE_PROVIDERS.includes(v as ImageProviderName);

const CACHE_MS = 30_000;
let cache: { nilai: ImageProviderName; sampai: number } | undefined;

/** Bawaan dari env IMAGE_PROVIDER, dipakai bila pengaturan di database belum diisi atau gagal dibaca. */
const bawaanEnv = (): ImageProviderName => (process.env.IMAGE_PROVIDER === "cloudflare" ? "cloudflare" : "gemini");

/** Provider gambar aktif: tabel app_settings (diubah dari /admin), di-cache 30 detik per proses server. */
export async function getImageProviderName(): Promise<ImageProviderName> {
  if (cache && cache.sampai > Date.now()) return cache.nilai;
  let nilai = bawaanEnv();
  try {
    const { data, error } = await createAdminClient().from("app_settings").select("value").eq("key", "image_provider").maybeSingle();
    if (error) throw error;
    if (isImageProviderName(data?.value)) nilai = data.value;
  } catch (e) {
    console.error("gagal membaca app_settings, pakai IMAGE_PROVIDER", e);
  }
  cache = { nilai, sampai: Date.now() + CACHE_MS };
  return nilai;
}

export async function setImageProviderName(nilai: ImageProviderName, userId: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("app_settings")
    .upsert({ key: "image_provider", value: nilai, updated_at: new Date().toISOString(), updated_by: userId });
  if (error) throw error;
  cache = { nilai, sampai: Date.now() + CACHE_MS };
}
