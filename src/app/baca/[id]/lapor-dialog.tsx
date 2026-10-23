"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Flag, X } from "lucide-react";
import { laporkanAksi } from "@/app/comics/komunitas-actions";
import { ALASAN_LAPORAN, MAX_CATATAN_LAPORAN } from "@/lib/comics/komunitas-schema";

/** Tombol dan dialog "Laporkan" komik. Hanya pengguna yang masuk yang bisa melapor. */
export function LaporDialog({ comicId, masuk }: { comicId: string; masuk: boolean }) {
  const [buka, setBuka] = useState(false);
  const [alasan, setAlasan] = useState<string>("");
  const [catatan, setCatatan] = useState("");
  const [hasil, setHasil] = useState<{ ok: boolean; pesan: string } | null>(null);
  const [memproses, mulai] = useTransition();

  function tutup() {
    setBuka(false);
    setHasil(null);
  }

  function kirim() {
    mulai(async () => {
      const res = await laporkanAksi(comicId, { alasan, catatan });
      setHasil(res.ok ? { ok: true, pesan: "Terima kasih. Laporan Anda sudah diterima dan akan ditinjau." } : { ok: false, pesan: res.error });
    });
  }

  return (
    <>
      <button type="button" onClick={() => setBuka(true)} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-gray-600 hover:bg-surface-muted">
        <Flag size={13} /> Laporkan
      </button>
      {buka && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && !memproses && tutup()}>
          <div role="dialog" aria-modal="true" aria-label="Laporkan komik" className="w-full max-w-sm rounded-xl bg-surface p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <h2 className="font-semibold">Laporkan komik ini</h2>
              <button type="button" aria-label="Tutup" onClick={tutup} className="rounded p-1 text-gray-500 hover:bg-surface-muted">
                <X size={16} />
              </button>
            </div>

            {!masuk ? (
              <>
                <p className="mt-3 text-sm text-gray-600">Masuk dulu untuk melaporkan komik, agar laporan tidak disalahgunakan.</p>
                <Link href={`/login?next=/baca/${comicId}`} className="mt-4 block rounded-lg bg-brand px-4 py-2 text-center text-sm font-medium text-brand-foreground">
                  Masuk
                </Link>
              </>
            ) : hasil?.ok ? (
              <>
                <p role="status" className="mt-3 rounded bg-emerald-50 p-3 text-sm text-emerald-800">
                  {hasil.pesan}
                </p>
                <button type="button" onClick={tutup} className="mt-4 w-full rounded-lg border border-line px-4 py-2 text-sm hover:bg-surface-muted">
                  Tutup
                </button>
              </>
            ) : (
              <>
                <fieldset className="mt-3 space-y-1.5">
                  <legend className="sr-only">Alasan</legend>
                  {ALASAN_LAPORAN.map((a) => (
                    <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/5">
                      <input type="radio" name="alasan" value={a.id} checked={alasan === a.id} onChange={() => setAlasan(a.id)} className="accent-[var(--color-brand)]" />
                      {a.label}
                    </label>
                  ))}
                </fieldset>
                <label htmlFor="catatan-lapor" className="mt-3 block text-xs font-medium text-gray-600">
                  Keterangan (opsional)
                </label>
                <textarea
                  id="catatan-lapor"
                  rows={3}
                  maxLength={MAX_CATATAN_LAPORAN}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
                />
                {hasil && (
                  <p role="alert" className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700">
                    {hasil.pesan}
                  </p>
                )}
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={tutup} disabled={memproses} className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-surface-muted disabled:opacity-40">
                    Batal
                  </button>
                  <button type="button" onClick={kirim} disabled={!alasan || memproses} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-40">
                    {memproses ? "Mengirim..." : "Kirim laporan"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
