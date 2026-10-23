"use client";

import { useActionState, useMemo, useState } from "react";
import { Coins, Search } from "lucide-react";
import type { PenggunaAdmin } from "@/lib/admin-kredit";
import { MAX_TAMBAH_KREDIT } from "@/lib/admin";
import { tambahKreditPengguna, type HasilKredit } from "./actions";

const CEPAT = [5, 10, 25, 50, 100];
const MAKS_TAMPIL = 30;

/** Cari pengguna lalu tambahkan kredit. Setiap penambahan tercatat di credit_ledger dengan email admin. */
export function PanelKredit({ pengguna }: { pengguna: PenggunaAdmin[] }) {
  const [cari, setCari] = useState("");
  const [terpilih, setTerpilih] = useState<PenggunaAdmin | null>(null);
  const [jumlah, setJumlah] = useState(10);
  const [hasil, aksi, memproses] = useActionState<HasilKredit, FormData>(tambahKreditPengguna, null);

  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase();
    const cocok = q ? pengguna.filter((p) => p.email.toLowerCase().includes(q) || p.nama.toLowerCase().includes(q)) : pengguna;
    return cocok.slice(0, MAKS_TAMPIL);
  }, [cari, pengguna]);

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <div>
        <label htmlFor="cari-pengguna" className="sr-only">
          Cari pengguna
        </label>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            id="cari-pengguna"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari email atau nama"
            className="h-9 w-full rounded-lg border border-line pl-9 pr-3 text-sm"
          />
        </div>
        <ul aria-label="Daftar pengguna" className="mt-2 max-h-72 divide-y divide-line overflow-y-auto rounded-lg border border-line">
          {daftar.length === 0 && <li className="p-3 text-sm text-gray-500">Tidak ada pengguna yang cocok.</li>}
          {daftar.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={terpilih?.id === p.id}
                onClick={() => setTerpilih(p)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-muted ${terpilih?.id === p.id ? "bg-brand/10" : ""}`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.nama || p.email}</span>
                  {p.nama && <span className="block truncate text-xs text-gray-500">{p.email}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-gray-600">
                  <Coins size={13} /> {p.saldo}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {pengguna.length > MAKS_TAMPIL && !cari && <p className="mt-1 text-xs text-gray-500">Menampilkan {MAKS_TAMPIL} terbaru. Ketik untuk mencari yang lain.</p>}
      </div>

      <form action={aksi} className="space-y-3 rounded-lg border border-line p-4">
        <input type="hidden" name="userId" value={terpilih?.id ?? ""} />
        <div className="text-sm">
          <p className="text-xs text-gray-500">Pengguna</p>
          {terpilih ? (
            <p className="font-medium">
              {terpilih.nama || terpilih.email} <span className="text-xs font-normal text-gray-500">· saldo {terpilih.saldo}</span>
            </p>
          ) : (
            <p className="text-gray-500">Pilih pengguna di daftar.</p>
          )}
        </div>

        <div>
          <label htmlFor="jumlah-kredit" className="text-xs font-medium text-gray-600">
            Jumlah kredit
          </label>
          <input
            id="jumlah-kredit"
            name="jumlah"
            type="number"
            min={1}
            max={MAX_TAMBAH_KREDIT}
            step={1}
            value={jumlah}
            onChange={(e) => setJumlah(Number(e.target.value))}
            className="mt-1 h-9 w-28 rounded-lg border border-line px-3 text-sm tabular-nums"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CEPAT.map((n) => (
              <button key={n} type="button" onClick={() => setJumlah(n)} className="rounded-full border border-line px-2.5 py-0.5 text-xs hover:border-brand hover:text-brand">
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="catatan-kredit" className="text-xs font-medium text-gray-600">
            Catatan (opsional)
          </label>
          <input id="catatan-kredit" name="catatan" maxLength={100} placeholder="mis. bonus uji coba" className="mt-1 h-9 w-full rounded-lg border border-line px-3 text-sm" />
        </div>

        <button
          type="submit"
          disabled={!terpilih || memproses || !Number.isInteger(jumlah) || jumlah < 1 || jumlah > MAX_TAMBAH_KREDIT}
          className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-40"
        >
          {memproses ? "Menambahkan..." : terpilih ? `Tambah ${jumlah} kredit` : "Tambah kredit"}
        </button>

        {hasil && (
          <p role={hasil.ok ? "status" : "alert"} className={`rounded p-2 text-xs ${hasil.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
            {hasil.pesan}
          </p>
        )}
      </form>
    </div>
  );
}
