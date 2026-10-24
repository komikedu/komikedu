import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NEXT_DIST_DIR memungkinkan build terpisah (mis. .next-build) tanpa merusak .next milik dev server yang sedang jalan
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // unpdf (ekstraksi PDF) hanya dipakai di server; jangan di-bundle agar tidak memicu peringatan import.meta
  serverExternalPackages: ["unpdf"],
  // sharp memilih biner native lewat require berdasarkan platform (switch di sharp/dist/sharp.cjs). Pelacak berkas build
  // (Turbopack) tidak mengikutinya, jadi paket biner (@img/sharp-linux-x64 dan libvips-nya) tidak ikut ke fungsi server dan
  // di Vercel muncul "Could not load the sharp module using the linux-x64 runtime". Sertakan paket yang terpasang di mesin build.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/@img/sharp-*/**/*", "./node_modules/@img/sharp-libvips-*/**/*", "./node_modules/detect-libc/**/*"],
  },
};

export default nextConfig;
