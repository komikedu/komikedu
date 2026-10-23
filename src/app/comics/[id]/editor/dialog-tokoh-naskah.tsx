"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, X } from "lucide-react";
import { TOKOH_PRESET, type Tokoh } from "@/lib/comics/tokoh";

type Sheet = { nama: string; deskripsi: string }[];

const COST_POTRET = 1;
const COST_HALAMAN = 1;
const adaPreset = (nama: string) => TOKOH_PRESET.some((p) => p.nama.toLowerCase() === nama.trim().toLowerCase());

/**
 * Muncul sebelum membuat gambar halaman bila naskah menyebut tokoh yang belum ada di daftar tokoh. Membuat semua tokoh itu
 * sekaligus (deskripsi dari AI, dan potret bila dipilih) agar wajah dan pakaiannya sama di semua gambar, lalu melanjutkan
 * membuat gambar halaman. "Lewati" melanjutkan seperti biasa: tokohnya ditambahkan otomatis setelah gambar jadi.
 */
export function DialogTokohNaskah({
  comicId,
  nama,
  saldo,
  setSaldo,
  setTokoh,
  setSheet,
  onLanjut,
  onBatal,
}: {
  comicId: string;
  nama: string[];
  saldo: number;
  setSaldo: (saldo: number) => void;
  setTokoh: (tokoh: Tokoh[]) => void;
  setSheet: (sheet: Sheet) => void;
  /** lanjutkan ke pembuatan gambar halaman */
  onLanjut: () => void;
  onBatal: () => void;
}) {
  const [pilih, setPilih] = useState<Set<string>>(() => new Set(nama));
  const jumlahPotretMaks = nama.filter((n) => !adaPreset(n)).length;
  const [denganPotret, setDenganPotret] = useState(saldo >= jumlahPotretMaks * COST_POTRET + COST_HALAMAN);
  const [fase, setFase] = useState<string | null>(null);
  const [galat, setGalat] = useState<string[]>([]);
  const [selesai, setSelesai] = useState(false);
  const sibuk = fase !== null;

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !sibuk && onBatal();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [sibuk, onBatal]);

  const terpilih = nama.filter((n) => pilih.has(n));
  const potretDipilih = terpilih.filter((n) => !adaPreset(n)).length;
  const biayaPotret = denganPotret ? potretDipilih * COST_POTRET : 0;
  const total = biayaPotret + COST_HALAMAN;
  const cukup = saldo >= total;

  async function buat() {
    setGalat([]);
    setFase("Menulis deskripsi tokoh...");
    const masalah: string[] = [];
    try {
      const res = await fetch(`/api/comics/${comicId}/tokoh/siapkan`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nama: terpilih }),
      });
      const json = (await res.json().catch(() => null)) as { ok: true; tokoh: Tokoh[]; karakter: Sheet; baru: Tokoh[] } | { ok: false; error: string } | null;
      if (!res.ok || !json?.ok) {
        setGalat([json && !json.ok ? json.error : "Gagal membuat tokoh. Coba lagi."]);
        return;
      }
      setTokoh(json.tokoh);
      setSheet(json.karakter);

      if (denganPotret) {
        const perlu = json.baru.filter((t) => !t.preset);
        for (let i = 0; i < perlu.length; i++) {
          setFase(`Membuat potret ${perlu[i].nama} (${i + 1}/${perlu.length})...`);
          try {
            const r = await fetch(`/api/comics/${comicId}/tokoh/${encodeURIComponent(perlu[i].id)}/gambar`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ jenis: "potret" }),
            });
            const j = (await r.json().catch(() => null)) as { ok: true; tokoh: Tokoh[]; saldo: number } | { ok: false; error: string } | null;
            if (r.ok && j?.ok) {
              setTokoh(j.tokoh);
              setSaldo(j.saldo);
            } else {
              masalah.push(`${perlu[i].nama}: ${j && !j.ok ? j.error : "gagal membuat potret"}`);
              // layanan gambar tidak tersedia (kuota habis): sisanya pasti gagal juga
              if (r.status === 503) break;
            }
          } catch {
            masalah.push(`${perlu[i].nama}: tidak ada koneksi`);
            break;
          }
        }
      }
    } catch {
      setGalat(["Tidak ada koneksi. Coba lagi."]);
      return;
    } finally {
      setFase(null);
    }
    // tokoh sudah masuk daftar; bila ada potret yang gagal, tampilkan dulu agar tidak terlewat
    if (masalah.length) {
      setGalat(masalah);
      setSelesai(true);
    } else onLanjut();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && !sibuk && onBatal()}>
      <div role="dialog" aria-modal="true" aria-label="Tokoh di naskah belum dibuat" className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-xl bg-surface p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
              <Users size={16} />
            </span>
            <div>
              <h2 className="text-lg font-semibold leading-tight">Tokoh belum dibuat</h2>
              <p className="mt-1 text-sm text-gray-600">
                Naskah halaman ini menyebut {nama.length} tokoh yang belum ada di daftar tokoh. Buat dulu agar wajah dan pakaiannya sama di semua gambar.
              </p>
            </div>
          </div>
          <button type="button" aria-label="Tutup" disabled={sibuk} onClick={onBatal} className="rounded p-1 text-gray-500 hover:bg-surface-muted disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <ul aria-label="Tokoh yang belum dibuat" className="mt-4 space-y-1.5">
          {nama.map((n) => (
            <li key={n}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/5">
                <input
                  type="checkbox"
                  checked={pilih.has(n)}
                  disabled={sibuk || selesai}
                  onChange={(e) =>
                    setPilih((s) => {
                      const baru = new Set(s);
                      if (e.target.checked) baru.add(n);
                      else baru.delete(n);
                      return baru;
                    })
                  }
                  className="h-4 w-4 accent-[var(--color-brand)]"
                />
                <span className="font-medium">{n}</span>
                {adaPreset(n) && <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">punya potret bawaan</span>}
              </label>
            </li>
          ))}
        </ul>

        {potretDipilih > 0 && (
          <label className="mt-3 flex cursor-pointer gap-2.5 text-sm">
            <input type="checkbox" checked={denganPotret} disabled={sibuk || selesai} onChange={(e) => setDenganPotret(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand)]" />
            <span>
              Buat juga potret AI untuk {potretDipilih} tokoh <span className="text-gray-500">({potretDipilih * COST_POTRET} kredit)</span>. Potret dipakai sebagai acuan wajah di setiap gambar.
            </span>
          </label>
        )}

        <p className="mt-3 rounded-lg bg-surface-muted p-2.5 text-xs text-gray-700">
          Deskripsi tokoh dibuat AI dan bisa diubah nanti di tab Tokoh.
          {" "}
          {selesai ? "" : `Gambar halaman ${COST_HALAMAN} kredit${biayaPotret ? `, potret ${biayaPotret} kredit` : ""}. Total ${total} kredit, saldo ${saldo}.`}
          {!cukup && !selesai && <span className="mt-1 block font-medium text-amber-800">Kredit tidak cukup. Matikan potret atau lewati langkah ini.</span>}
        </p>

        {fase && (
          <p role="status" className="mt-3 flex items-center gap-2 rounded bg-surface-muted p-2 text-xs text-gray-700">
            <Loader2 size={13} className="animate-spin" /> {fase}
          </p>
        )}
        {galat.length > 0 && (
          <div role="alert" className="mt-3 rounded bg-red-50 p-2 text-xs text-red-700">
            {selesai && <p className="mb-1 font-medium">Tokoh sudah dibuat, tetapi sebagian potret gagal (kredit dikembalikan). Potret bisa dibuat lagi di tab Tokoh.</p>}
            <ul className="list-disc pl-4">
              {galat.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {selesai ? (
            <button type="button" onClick={onLanjut} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground">
              Lanjut buat gambar halaman
            </button>
          ) : (
            <>
              <button type="button" onClick={onLanjut} disabled={sibuk} className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-surface-muted disabled:opacity-40">
                Lewati
              </button>
              <button
                type="button"
                onClick={() => void buat()}
                disabled={sibuk || terpilih.length === 0 || !cukup}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-40"
              >
                {sibuk ? "Membuat..." : "Buat tokoh dan lanjut"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
