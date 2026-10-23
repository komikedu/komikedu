"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Sparkles, Upload, X } from "lucide-react";
import { gambarTokoh, isPresetId, type Tokoh } from "@/lib/comics/tokoh";
import { simpanTokoh } from "./actions";

const COST = 1;
const MAX_BYTES = 5 * 1024 * 1024;

type Jenis = "potret" | "badan";
type Busy = null | "simpan" | "unggah" | Jenis;

/** Gambar yang tampil untuk tab ini: potret tokoh siap pakai ada di /public, selebihnya URL di penyimpanan. */
function gambarUntuk(t: Tokoh, jenis: Jenis, gaya: string | null): string | null {
  if (jenis === "potret" && t.preset && isPresetId(t.id)) return gambarTokoh(t.id, gaya);
  return (jenis === "potret" ? t.potret : t.badan) ?? null;
}

/**
 * Dialog besar detail tokoh, mirip Google Flow: pratinjau gambar yang lebar dengan tab Potret dan Badan penuh,
 * buat dengan AI atau unggah sendiri, plus deskripsi penampilan (prompt) yang bisa diedit sebelum membuat gambar.
 */
export function TokohDetail({
  comicId,
  tokohId,
  tokoh,
  setTokoh,
  gaya,
  saldo,
  setSaldo,
  onClose,
}: {
  comicId: string;
  tokohId: string;
  tokoh: Tokoh[];
  setTokoh: (tokoh: Tokoh[]) => void;
  gaya: string | null;
  saldo: number;
  setSaldo: (saldo: number) => void;
  onClose: () => void;
}) {
  const t = tokoh.find((x) => x.id === tokohId);
  const [tab, setTab] = useState<Jenis>("potret");
  const [draf, setDraf] = useState(t?.deskripsi ?? "");
  const [busy, setBusy] = useState<Busy>(null);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && busy === null && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [busy, onClose]);

  if (!t) return null;
  const preset = t.preset && isPresetId(t.id);
  const bisaDiubah = !(preset && tab === "potret");
  const kurang = saldo < COST;
  const gambar = gambarUntuk(t, tab, gaya);
  const labelTab: Record<Jenis, string> = { potret: "Potret", badan: "Badan penuh" };

  async function jalankan<T>(mode: Busy, fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(mode);
    setPesan(null);
    try {
      return await fn();
    } catch {
      setPesan({ ok: false, teks: "Tidak ada koneksi. Coba lagi." });
    } finally {
      setBusy(null);
    }
  }

  /** Simpan deskripsi baru. Gambar lama dibuang dari data tokoh karena penampilannya sudah tidak cocok. */
  async function simpanDeskripsi(): Promise<Tokoh | null> {
    const baru = draf.trim();
    if (!baru || baru === t!.deskripsi) return t!;
    const diubah = { ...t!, deskripsi: baru, potret: undefined, badan: undefined };
    const next = tokoh.map((x) => (x.id === t!.id ? diubah : x));
    const res = await simpanTokoh(comicId, { tokoh: next, ganti: [] });
    if (!res.ok) {
      setPesan({ ok: false, teks: res.error });
      return null;
    }
    setTokoh(next);
    return diubah;
  }

  async function buat(jenis: Jenis, denganSimpan: boolean) {
    if (!window.confirm(`Buat ${labelTab[jenis].toLowerCase()} ${t!.nama} dengan AI? Memakai ${COST} kredit (dikembalikan bila gagal).`)) return;
    await jalankan(jenis, async () => {
      if (denganSimpan && !(await simpanDeskripsi())) return;
      const res = await fetch(`/api/comics/${comicId}/tokoh/${encodeURIComponent(t!.id)}/gambar`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jenis }),
      });
      const json = (await res.json().catch(() => null)) as { ok: true; tokoh: Tokoh[]; saldo: number } | { ok: false; error: string } | null;
      if (res.ok && json?.ok) {
        setTokoh(json.tokoh);
        setSaldo(json.saldo);
        setPesan({ ok: true, teks: `${labelTab[jenis]} ${t!.nama} jadi. Dipakai sebagai acuan di gambar berikutnya.` });
      } else {
        setPesan({ ok: false, teks: json && !json.ok ? json.error : "Gagal membuat gambar. Coba lagi." });
      }
    });
  }

  async function unggah(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return setPesan({ ok: false, teks: "Gambar harus berformat JPG, PNG, atau WebP." });
    if (file.size > MAX_BYTES) return setPesan({ ok: false, teks: "Ukuran gambar maksimal 5 MB." });
    await jalankan("unggah", async () => {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch(`/api/comics/${comicId}/tokoh/${encodeURIComponent(t!.id)}/gambar?jenis=${tab}`, { method: "PUT", body: form });
      const json = (await res.json().catch(() => null)) as { ok: true; tokoh: Tokoh[] } | { ok: false; error: string } | null;
      if (res.ok && json?.ok) {
        setTokoh(json.tokoh);
        setPesan({ ok: true, teks: `${labelTab[tab]} ${t!.nama} diganti dengan gambar Anda.` });
      } else {
        setPesan({ ok: false, teks: json && !json.ok ? json.error : "Gagal mengunggah gambar. Coba lagi." });
      }
    });
  }

  async function simpanSaja() {
    await jalankan("simpan", async () => {
      const hasil = await simpanDeskripsi();
      if (hasil) setPesan({ ok: true, teks: "Deskripsi tersimpan. Gambar lama tokoh ini dibuang; buat gambar baru agar sesuai." });
    });
  }

  /** Tokoh siap pakai tidak bisa diedit karena potretnya tetap; salin jadi tokoh sendiri agar deskripsinya bisa diubah. */
  async function jadikanSendiri() {
    if (!window.confirm(`Ubah ${t!.nama} jadi tokoh sendiri? Potret bawaannya tidak dipakai lagi; deskripsinya bisa Anda ubah, lalu buat gambar baru dengan AI.`)) return;
    await jalankan("simpan", async () => {
      const baru: Tokoh = { id: `sendiri-${crypto.randomUUID().slice(0, 8)}`, nama: t!.nama, peran: "", deskripsi: t!.deskripsi, preset: false };
      const next = tokoh.map((x) => (x.id === t!.id ? baru : x));
      const res = await simpanTokoh(comicId, { tokoh: next, ganti: [] });
      if (!res.ok) return setPesan({ ok: false, teks: res.error });
      setTokoh(next);
      onClose(); // dialog dibuka ulang dari daftar dengan id baru
    });
  }

  const sibuk = busy !== null;
  const berubah = draf.trim() !== t.deskripsi;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && !sibuk && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={`Detail tokoh ${t.nama}`} className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl md:flex-row">
        {/* pratinjau besar */}
        <div className="flex min-h-0 flex-1 flex-col bg-neutral-900 p-4">
          <div className="relative h-[min(60vh,520px)] w-full overflow-hidden rounded-xl bg-neutral-800 md:h-[min(70vh,560px)]">
            {gambar ? (
              <Image src={gambar} alt={`${labelTab[tab]} ${t.nama}`} fill unoptimized className="object-contain" />
            ) : (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
                <div>
                  <p className="text-lg font-semibold">Buat atau tambahkan gambar karakter</p>
                  <p className="mt-1 text-xs text-white/60">{tab === "potret" ? "Potret setengah badan untuk avatar dan acuan wajah." : "Seluruh tubuh, untuk acuan pakaian dan postur."}</p>
                </div>
              </div>
            )}
            {sibuk && busy !== "simpan" && (
              <div role="status" className="absolute inset-0 grid place-items-center bg-black/60 text-white">
                <p className="flex items-center gap-2 text-sm">
                  <Loader2 size={18} className="animate-spin" /> {busy === "unggah" ? "Mengunggah..." : `Membuat ${labelTab[busy as Jenis].toLowerCase()}... biasanya 10 sampai 40 detik`}
                </p>
              </div>
            )}
          </div>
          <div role="tablist" aria-label="Jenis gambar" className="mt-3 flex justify-center gap-2">
            {(["potret", "badan"] as const).map((j) => {
              const g = gambarUntuk(t, j, gaya);
              return (
                <button
                  key={j}
                  role="tab"
                  type="button"
                  aria-selected={tab === j}
                  disabled={sibuk}
                  onClick={() => setTab(j)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm ${tab === j ? "bg-white text-gray-900" : "bg-neutral-800 text-white hover:bg-neutral-700"}`}
                >
                  <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded bg-neutral-700">
                    {g && <Image src={g} alt="" fill unoptimized className="object-cover object-top" />}
                  </span>
                  {labelTab[j]}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={!bisaDiubah || sibuk || kurang}
              onClick={() => void buat(tab, false)}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              <Sparkles size={14} /> {gambar ? "Buat ulang" : "Buat"} dengan AI · {COST} kredit
            </button>
            <button
              type="button"
              disabled={!bisaDiubah || sibuk}
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg bg-neutral-700 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-600 disabled:opacity-40"
            >
              <Upload size={14} /> Unggah
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              aria-label={`Unggah ${labelTab[tab].toLowerCase()}`}
              onChange={(e) => {
                void unggah(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          {!bisaDiubah && <p className="mt-2 text-center text-xs text-white/60">Potret tokoh siap pakai tidak bisa diganti. Ubah jadi tokoh sendiri untuk menggantinya.</p>}
          {kurang && bisaDiubah && <p className="mt-2 text-center text-xs text-amber-300">Kredit tidak cukup untuk membuat dengan AI. Unggah gambar sendiri tidak memakai kredit.</p>}
        </div>

        {/* deskripsi dan aksi */}
        <div className="flex w-full shrink-0 flex-col overflow-y-auto p-5 md:w-80">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{t.nama}</h2>
              <p className="text-xs text-gray-500">{preset ? t.peran || "Tokoh siap pakai" : "Tokoh buatan sendiri"}</p>
            </div>
            <button type="button" aria-label="Tutup" disabled={sibuk} onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-surface-muted disabled:opacity-40">
              <X size={18} />
            </button>
          </div>

          <label htmlFor="deskripsi-tokoh-detail" className="mt-4 text-xs font-medium text-gray-600">
            Deskripsi penampilan (prompt untuk AI)
          </label>
          {preset ? (
            <>
              <p id="deskripsi-tokoh-detail" className="mt-1 rounded bg-surface-muted p-2 text-xs text-gray-700">
                {t.deskripsi}
              </p>
              <button
                type="button"
                disabled={sibuk}
                onClick={() => void jadikanSendiri()}
                className="mt-2 w-full rounded-lg border border-line px-3 py-2 text-xs hover:border-brand hover:text-brand disabled:opacity-40"
              >
                Ubah jadi tokoh sendiri untuk mengedit
              </button>
            </>
          ) : (
            <>
              <textarea
                id="deskripsi-tokoh-detail"
                rows={7}
                maxLength={300}
                value={draf}
                onChange={(e) => setDraf(e.target.value)}
                placeholder="Usia, rambut, pakaian, aksesori. Mis. anak laki-laki 10 tahun, rambut merah, kaos hijau, kacamata bulat, topi biru"
                className="mt-1 w-full rounded border border-line px-2 py-1.5 text-xs"
              />
              <p className="mt-1 text-[11px] text-gray-500">{draf.length}/300. Ubah pakaian atau aksesori di sini, lalu buat gambar baru.</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={sibuk || !draf.trim() || !berubah}
                  onClick={() => void simpanSaja()}
                  className="rounded-lg border border-line px-3 py-2 text-xs hover:bg-surface-muted disabled:opacity-40"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  disabled={sibuk || !draf.trim() || kurang}
                  onClick={() => void buat(tab, true)}
                  className="flex items-center justify-center gap-1 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                >
                  <ImagePlus size={13} /> Simpan dan buat
                </button>
              </div>
              {berubah && <p className="mt-2 text-[11px] text-amber-700">Mengubah deskripsi membuang potret dan badan penuh lama karena sudah tidak cocok.</p>}
            </>
          )}

          {pesan && (
            <p role={pesan.ok ? "status" : "alert"} className={`mt-3 rounded p-2 text-xs ${pesan.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
              {pesan.teks}
            </p>
          )}
          <p className="mt-auto pt-4 text-[11px] text-gray-500">Gambar tokoh dikirim ke AI sebagai acuan wajah dan pakaian saat membuat gambar halaman atau mengedit panel.</p>
        </div>
      </div>
    </div>
  );
}
