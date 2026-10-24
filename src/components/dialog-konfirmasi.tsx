"use client";

import { useEffect } from "react";

/**
 * Dialog konfirmasi aplikasi, pengganti window.confirm bawaan peramban. Tampil bila `buka` benar; Escape atau klik di luar
 * kotak membatalkan. `bahaya` mewarnai tombol utama merah untuk tindakan yang menghapus data.
 */
export function DialogKonfirmasi({
  buka,
  judul,
  children,
  labelOk,
  labelBatal = "Batal",
  bahaya = false,
  onOk,
  onBatal,
}: {
  buka: boolean;
  judul: string;
  children: React.ReactNode;
  labelOk: string;
  labelBatal?: string;
  bahaya?: boolean;
  onOk: () => void;
  onBatal: () => void;
}) {
  useEffect(() => {
    if (!buka) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onBatal();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [buka, onBatal]);

  if (!buka) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onBatal()}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="judul-konfirmasi" className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
        <h2 id="judul-konfirmasi" className="text-lg font-semibold">
          {judul}
        </h2>
        <div className="mt-2 text-sm leading-relaxed text-gray-600">{children}</div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onBatal} className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-surface-muted">
            {labelBatal}
          </button>
          <button type="button" autoFocus onClick={onOk} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${bahaya ? "bg-danger" : "bg-brand text-brand-foreground"}`}>
            {labelOk}
          </button>
        </div>
      </div>
    </div>
  );
}
