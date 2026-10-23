"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

/**
 * Tombol "Lengkapi dengan AI" untuk deskripsi tokoh: menambahkan usia, rambut, pakaian, dan ciri khas yang belum ditulis
 * (detail yang sudah ada dipertahankan, dan tokoh yang disebut "adik Raka" dibuat serasi dengan Raka) supaya gambar
 * yang dihasilkan lebih baik. Hasilnya hanya mengisi kolom deskripsi, guru masih bisa mengubahnya, dan bisa dikembalikan.
 */
export function TombolLengkapi({
  comicId,
  nama,
  deskripsi,
  onHasil,
  disabled = false,
}: {
  comicId: string;
  nama: string;
  deskripsi: string;
  onHasil: (deskripsi: string) => void;
  disabled?: boolean;
}) {
  const [sibuk, setSibuk] = useState(false);
  const [sebelumnya, setSebelumnya] = useState<string | null>(null);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);

  async function lengkapi() {
    setSibuk(true);
    setPesan(null);
    try {
      const res = await fetch(`/api/comics/${comicId}/tokoh/lengkapi`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nama, deskripsi }),
      });
      const json = (await res.json().catch(() => null)) as { ok: true; deskripsi: string } | { ok: false; error: string } | null;
      if (res.ok && json?.ok) {
        setSebelumnya(deskripsi);
        onHasil(json.deskripsi);
        setPesan({ ok: true, teks: "Deskripsi dilengkapi AI. Periksa dan ubah bila perlu." });
      } else setPesan({ ok: false, teks: json && !json.ok ? json.error : "Gagal melengkapi deskripsi. Coba lagi." });
    } catch {
      setPesan({ ok: false, teks: "Tidak ada koneksi. Coba lagi." });
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void lengkapi()}
          disabled={disabled || sibuk || !nama.trim()}
          title={nama.trim() ? "Lengkapi usia, rambut, pakaian, dan ciri khas dengan AI (gratis)" : "Isi nama tokoh dulu"}
          className="flex items-center gap-1.5 rounded-lg border border-brand px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/5 disabled:opacity-40"
        >
          {sibuk ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {sibuk ? "Melengkapi..." : "Lengkapi dengan AI"}
        </button>
        {sebelumnya !== null && !sibuk && (
          <button
            type="button"
            onClick={() => {
              onHasil(sebelumnya);
              setSebelumnya(null);
              setPesan(null);
            }}
            className="text-xs text-gray-600 underline hover:text-brand"
          >
            Kembalikan yang tadi
          </button>
        )}
      </div>
      {pesan && (
        <p role={pesan.ok ? "status" : "alert"} className={`mt-1.5 text-xs ${pesan.ok ? "text-emerald-700" : "text-red-700"}`}>
          {pesan.teks}
        </p>
      )}
    </div>
  );
}
