"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Copy, ImagePlus, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { promptTokohSalin, type BentukPrompt } from "@/lib/comics/prompt-tokoh";
import type { Tokoh } from "@/lib/comics/tokoh";
import type { TokohLama } from "@/lib/comics/tokoh-lama";

export type StatusAnalisis = "idle" | "jalan" | "galat";

/** Tombol yang menyalin prompt gambar tokoh ke papan klip untuk ditempel di ChatGPT atau Google Flow. */
function TombolSalin({ tokoh, gaya, bentuk, label }: { tokoh: Tokoh; gaya: string | null; bentuk: BentukPrompt; label: string }) {
  const [tersalin, setTersalin] = useState(false);
  async function salin() {
    try {
      await navigator.clipboard.writeText(promptTokohSalin(tokoh, gaya, bentuk));
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      setTersalin(false);
    }
  }
  return (
    <button type="button" onClick={() => void salin()} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:bg-surface-muted">
      {tersalin ? <Check size={13} className="text-brand" /> : <Copy size={13} />} {tersalin ? "Tersalin" : label}
    </button>
  );
}

/**
 * Daftar tokoh hasil analisis cerita yang ditempel guru. Tiap tokoh bisa diubah ciri-cirinya, dihapus, lalu diberi gambar
 * dengan AI, unggahan sendiri, atau gambar dari ChatGPT/Flow (prompt disalin di sini, hasilnya diunggah).
 */
export function TokohCeritaPanel({
  tokoh,
  gaya,
  status,
  galat,
  onCari,
  onUbahDeskripsi,
  onHapus,
  onBuka,
}: {
  tokoh: Tokoh[];
  gaya: string | null;
  status: StatusAnalisis;
  galat: string | null;
  onCari: () => void;
  onUbahDeskripsi: (id: string, deskripsi: string) => void;
  onHapus: (id: string) => void;
  onBuka: (id: string) => void;
}) {
  const jalan = status === "jalan";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p role="status" aria-live="polite" className="text-sm text-gray-600">
          {jalan ? "Membaca ceritamu untuk mencari tokoh..." : tokoh.length ? `${tokoh.length} tokoh ditemukan di ceritamu.` : "Belum ada tokoh dari ceritamu."}
        </p>
        <button type="button" disabled={jalan} onClick={onCari} className="flex shrink-0 items-center gap-1.5 text-sm text-brand underline disabled:opacity-50">
          {jalan ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {tokoh.length ? "Cari ulang" : "Cari tokoh"}
        </button>
      </div>

      {status === "galat" && galat && (
        <p role="alert" className="text-sm text-danger">
          {galat}
        </p>
      )}

      <ul className="grid gap-x-8 gap-y-7 md:grid-cols-2">
        {tokoh.map((t) => (
          <li key={t.id} className="flex gap-3">
            <span className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-teal-100 text-2xl font-bold text-brand">
              {t.potret ? <Image src={t.potret} alt="" fill unoptimized crossOrigin="anonymous" className="object-cover object-top" /> : t.nama.charAt(0).toUpperCase()}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold">
                  {t.nama}
                  {t.peran && <span className="ml-2 text-xs font-normal text-gray-500">{t.peran}</span>}
                </p>
                <button type="button" aria-label={`Hapus tokoh ${t.nama}`} onClick={() => onHapus(t.id)} className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-gray-500 hover:text-danger">
                  <X size={14} />
                </button>
              </div>
              <textarea
                aria-label={`Ciri-ciri ${t.nama}`}
                rows={4}
                maxLength={300}
                value={t.deskripsi}
                onChange={(e) => onUbahDeskripsi(t.id, e.target.value)}
                className="field-sizing-content min-h-20 w-full resize-none rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm leading-relaxed text-gray-700 hover:border-line focus:border-line focus:bg-white"
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onBuka(t.id)} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground">
                  <Sparkles size={13} /> {t.potret ? "Ubah gambar" : "Buat dengan AI"}
                </button>
                <button type="button" onClick={() => onBuka(t.id)} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:bg-surface-muted">
                  <ImagePlus size={13} /> Unggah gambar
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500">Salin prompt untuk ChatGPT / Flow:</span>
                <TombolSalin tokoh={t} gaya={gaya} bentuk="potret" label="Potret" />
                <TombolSalin tokoh={t} gaya={gaya} bentuk="badan" label="Badan penuh" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Tokoh buatan guru dari komiknya yang lain; satu klik memakainya di komik ini lengkap dengan gambarnya. */
export function TokohLamaPanel({
  daftar,
  dipakai,
  sibuk,
  galat,
  onPakai,
}: {
  daftar: TokohLama[];
  /** nama tokoh (huruf kecil) yang sudah ada di komik ini */
  dipakai: Set<string>;
  sibuk: string | null;
  galat: string | null;
  onPakai: (t: TokohLama) => void;
}) {
  return (
    <section aria-labelledby="judul-tokoh-lama" className="mt-4 flex flex-col gap-3">
      <div>
        <h3 id="judul-tokoh-lama" className="text-sm font-semibold">
          Tokoh dari komikmu yang lain
        </h3>
        <p className="text-xs text-gray-500">Pakai ulang tokoh yang sudah pernah kamu buat, lengkap dengan gambarnya.</p>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {daftar.map((l) => {
          const sudah = dipakai.has(l.tokoh.nama.trim().toLowerCase());
          return (
            <li key={`${l.comicId}-${l.tokoh.id}`}>
              <button
                type="button"
                disabled={sudah || sibuk !== null}
                onClick={() => onPakai(l)}
                className="flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left hover:bg-surface-muted disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-teal-100 text-base font-bold text-brand">
                  {l.tokoh.potret ? <Image src={l.tokoh.potret} alt="" fill unoptimized crossOrigin="anonymous" className="object-cover object-top" /> : l.tokoh.nama.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{l.tokoh.nama}</span>
                  <span className="block truncate text-[11px] text-gray-500">{sibuk === l.tokoh.id ? "Memakai..." : sudah ? "Sudah dipakai" : l.judulKomik}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {galat && (
        <p role="alert" className="text-sm text-danger">
          {galat}
        </p>
      )}
    </section>
  );
}
