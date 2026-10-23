import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NEXT_DIST_DIR memungkinkan build terpisah (mis. .next-build) tanpa merusak .next milik dev server yang sedang jalan
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // unpdf (ekstraksi PDF) hanya dipakai di server; jangan di-bundle agar tidak memicu peringatan import.meta
  serverExternalPackages: ["unpdf"],
};

export default nextConfig;
