import "server-only";
import { CloudflareImageProvider } from "./cloudflare-image";
import { GeminiImageProvider } from "./gemini-image";
import type { ImageProvider } from "./image-provider";

let provider: ImageProvider | undefined;

/**
 * Provider gambar aktif dari env IMAGE_PROVIDER: "gemini" (bawaan, berbayar) atau "cloudflare" (FLUX.2 klein, kuota gratis harian).
 * Tidak ada fallback otomatis ke Gemini saat kuota Cloudflare habis, supaya tidak ada tagihan tanpa sengaja.
 */
export function getImageProvider(): ImageProvider {
  return (provider ??= process.env.IMAGE_PROVIDER === "cloudflare" ? new CloudflareImageProvider() : new GeminiImageProvider());
}
