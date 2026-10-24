"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { galatUkuran, jenisUkuran, PRESET_UKURAN, SISI_MAKS, SISI_MIN } from "@/lib/editor/ukuran-halaman";
import type { UkuranHalaman } from "@/lib/editor/types";

/** Gambar persegi panjang kecil yang menunjukkan bentuk ukuran, tingginya dibatasi agar semua pilihan sejajar. */
function Bentuk({ u }: { u: UkuranHalaman }) {
  const maks = 26;
  const k = maks / Math.max(u.w, u.h);
  return <span aria-hidden className="block rounded-[3px] border-2 border-current" style={{ width: Math.max(10, u.w * k), height: Math.max(10, u.h * k) }} />;
}

const tombol = "grid place-items-center gap-1.5 rounded-lg border-2 px-2 py-3 text-xs font-medium";

/**
 * Pilihan ukuran kanvas halaman: Vertikal, Kotak, Horizontal, atau ukuran kustom (lebar x tinggi).
 * `onChange` dipanggil hanya dengan ukuran yang valid.
 */
export function PilihUkuranHalaman({ nilai, onChange, disabled = false }: { nilai: UkuranHalaman; onChange: (u: UkuranHalaman) => void; disabled?: boolean }) {
  const jenis = jenisUkuran(nilai);
  const [kustomBuka, setKustomBuka] = useState(jenis === "kustom");
  const [lebar, setLebar] = useState(String(nilai.w));
  const [tinggi, setTinggi] = useState(String(nilai.h));
  const [galat, setGalat] = useState<string | null>(null);

  function terapkanKustom() {
    const u = { w: Number(lebar), h: Number(tinggi) };
    const g = galatUkuran(u);
    setGalat(g);
    if (!g) onChange(u);
  }

  return (
    <div>
      <div role="radiogroup" aria-label="Ukuran halaman" className="grid grid-cols-3 gap-2">
        {PRESET_UKURAN.map((p) => {
          const aktif = jenis === p.id && !kustomBuka;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={aktif}
              disabled={disabled}
              onClick={() => {
                setKustomBuka(false);
                setGalat(null);
                setLebar(String(p.ukuran.w));
                setTinggi(String(p.ukuran.h));
                if (jenis !== p.id) onChange(p.ukuran);
              }}
              className={`${tombol} ${aktif ? "border-brand bg-brand/10 text-brand" : "border-line text-gray-600 hover:bg-surface-muted"}`}
            >
              <Bentuk u={p.ukuran} />
              {p.nama}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        aria-expanded={kustomBuka}
        disabled={disabled}
        onClick={() => setKustomBuka((v) => !v)}
        className={`mt-2 flex w-full items-center justify-between rounded-lg border-2 px-3 py-2 text-left text-sm font-medium ${kustomBuka || jenis === "kustom" ? "border-brand bg-brand/10 text-brand" : "border-line text-gray-700 hover:bg-surface-muted"}`}
      >
        Ukuran kustom
        {jenis === "kustom" && !kustomBuka && <span className="text-xs font-normal">{nilai.w} x {nilai.h}</span>}
      </button>

      {kustomBuka && (
        <div className="mt-2 rounded-lg border border-line p-3">
          <div className="flex items-end gap-2">
            <label className="flex-1 text-xs font-medium text-gray-600">
              Lebar
              <input
                type="number"
                inputMode="numeric"
                min={SISI_MIN}
                max={SISI_MAKS}
                value={lebar}
                disabled={disabled}
                onChange={(e) => setLebar(e.target.value)}
                className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm text-foreground"
              />
            </label>
            <span aria-hidden className="pb-2 text-gray-400">x</span>
            <label className="flex-1 text-xs font-medium text-gray-600">
              Tinggi
              <input
                type="number"
                inputMode="numeric"
                min={SISI_MIN}
                max={SISI_MAKS}
                value={tinggi}
                disabled={disabled}
                onChange={(e) => setTinggi(e.target.value)}
                className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm text-foreground"
              />
            </label>
            <button type="button" disabled={disabled} onClick={terapkanKustom} aria-label="Terapkan ukuran kustom" className="grid h-9 w-9 place-items-center rounded-md bg-brand text-brand-foreground hover:bg-brand-hover disabled:opacity-50">
              <Check size={16} />
            </button>
          </div>
          <p role={galat ? "alert" : undefined} className={`mt-2 text-xs ${galat ? "text-danger" : "text-gray-500"}`}>
            {galat ?? `Sisi ${SISI_MIN} sampai ${SISI_MAKS}. Perbandingan sisi paling jauh 3:1.`}
          </p>
        </div>
      )}
    </div>
  );
}
