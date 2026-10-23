import "server-only";
import { getImageProviderName, type ImageProviderName } from "@/lib/settings";
import { CloudflareImageProvider } from "./cloudflare-image";
import { GeminiImageProvider } from "./gemini-image";
import type { ImageProvider } from "./image-provider";

const instans: Partial<Record<ImageProviderName, ImageProvider>> = {};

/**
 * Provider gambar aktif dari pengaturan /admin (bawaan: env IMAGE_PROVIDER): "gemini" (berbayar) atau
 * "cloudflare" (FLUX.2 klein, kuota gratis harian). Tidak ada fallback otomatis ke Gemini saat kuota
 * Cloudflare habis, supaya tidak ada tagihan tanpa sengaja.
 */
export async function getImageProvider(): Promise<ImageProvider> {
  const nama = await getImageProviderName();
  return (instans[nama] ??= nama === "cloudflare" ? new CloudflareImageProvider() : new GeminiImageProvider());
}
