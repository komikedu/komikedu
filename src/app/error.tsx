"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Halaman galat bagi semua rute: pesan ramah dan kode kesalahan (digest) yang cocok dengan baris log server. */
export default function Galat({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("galat halaman", error.digest ?? "", error.message);
  }, [error]);

  return (
    <main className="mx-auto grid min-h-screen max-w-md place-content-center gap-4 p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">Halaman gagal dimuat</h1>
        <p className="mt-2 text-sm text-gray-600">Ada gangguan di server. Coba muat ulang; kalau masih gagal, tunggu sebentar lalu coba lagi.</p>
        {error.digest && (
          <p className="mt-3 text-xs text-gray-500">
            Kode kesalahan: <code className="rounded bg-surface-muted px-1.5 py-0.5">{error.digest}</code>
          </p>
        )}
      </div>
      <div className="flex justify-center gap-2">
        <button type="button" onClick={reset} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover">
          Coba lagi
        </button>
        <Link href="/" className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-surface-muted">
          Ke beranda
        </Link>
      </div>
    </main>
  );
}
