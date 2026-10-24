"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft, Coins, Loader2 } from "lucide-react";
import { MAKS_NAMA, MAKS_SEKOLAH, PERAN, rapikan } from "@/lib/profil";
import { simpanProfil } from "./actions";

type Isi = { nama: string; peran: string; sekolah: string };

export function ProfilForm({ email, masuk, saldo, awal }: { email: string; masuk: string; saldo: number; awal: Isi }) {
  const [tersimpan, setTersimpan] = useState<Isi>(awal);
  const [isi, setIsi] = useState<Isi>(awal);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);
  const [menyimpan, mulai] = useTransition();

  const berubah = isi.nama !== tersimpan.nama || isi.peran !== tersimpan.peran || isi.sekolah !== tersimpan.sekolah;
  const inisial = (isi.nama || email).trim().charAt(0).toUpperCase() || "?";
  const ubah = (patch: Partial<Isi>) => {
    setIsi((s) => ({ ...s, ...patch }));
    setPesan(null);
  };

  function simpan(e: React.FormEvent) {
    e.preventDefault();
    mulai(async () => {
      const res = await simpanProfil({ nama: isi.nama, peran: isi.peran || null, sekolah: isi.sekolah });
      if (res.ok) {
        const rapi = { nama: rapikan(isi.nama), peran: isi.peran, sekolah: rapikan(isi.sekolah) };
        setIsi(rapi);
        setTersimpan(rapi);
        setPesan({ ok: true, teks: "Profil tersimpan." });
      } else setPesan({ ok: false, teks: res.error });
    });
  }

  const kolom = "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

  return (
    <form onSubmit={simpan} className="mt-6 space-y-6 rounded-2xl border border-line bg-surface p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand text-2xl font-semibold text-brand-foreground">
          {inisial}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{isi.nama || "Belum ada nama"}</p>
          <p className="truncate text-sm text-gray-600">{email}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
            <Coins size={13} className="text-amber-600" /> {saldo} kredit tersisa
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="nama" className="text-sm font-semibold">
          Nama
        </label>
        <input id="nama" value={isi.nama} maxLength={MAKS_NAMA} required autoComplete="name" onChange={(e) => ubah({ nama: e.target.value })} className={kolom} />
        <p className="mt-1 text-xs text-gray-500">Tampil di sapaan dan sebagai penulis komik yang Anda terbitkan.</p>
      </div>

      <div>
        <label htmlFor="email" className="text-sm font-semibold">
          Email
        </label>
        <input id="email" value={email} readOnly disabled className={`${kolom} cursor-not-allowed bg-surface-muted text-gray-500`} />
        <p className="mt-1 text-xs text-gray-500">Masuk lewat {masuk}. Email tidak bisa diubah di sini.</p>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold">Peran</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {PERAN.map((p) => (
            <label key={p.id} className={`cursor-pointer rounded-xl border p-3 text-sm ${isi.peran === p.id ? "border-brand bg-brand/5 ring-2 ring-brand/30" : "border-line hover:bg-surface-muted"}`}>
              <input type="radio" name="peran" value={p.id} checked={isi.peran === p.id} onChange={() => ubah({ peran: p.id })} className="sr-only" />
              <span className="block font-medium">{p.nama}</span>
              <span className="mt-0.5 block text-xs text-gray-500">{p.keterangan}</span>
            </label>
          ))}
        </div>
        {isi.peran && (
          <button type="button" onClick={() => ubah({ peran: "" })} className="mt-2 text-xs text-gray-500 underline hover:text-foreground">
            Kosongkan pilihan
          </button>
        )}
      </fieldset>

      <div>
        <label htmlFor="sekolah" className="text-sm font-semibold">
          Sekolah <span className="font-normal text-gray-500">(opsional)</span>
        </label>
        <input id="sekolah" value={isi.sekolah} maxLength={MAKS_SEKOLAH} autoComplete="organization" onChange={(e) => ubah({ sekolah: e.target.value })} placeholder="Mis. SDN 1 Merdeka" className={kolom} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-foreground">
          <ArrowLeft size={14} /> Kembali ke beranda
        </Link>
        <div className="flex items-center gap-3">
          {pesan && (
            <p role={pesan.ok ? "status" : "alert"} className={`text-sm ${pesan.ok ? "text-emerald-700" : "text-danger"}`}>
              {pesan.teks}
            </p>
          )}
          <button type="submit" disabled={!berubah || menyimpan || !isi.nama.trim()} className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-brand-foreground disabled:cursor-not-allowed disabled:opacity-50">
            {menyimpan && <Loader2 size={14} className="animate-spin" />} {menyimpan ? "Menyimpan..." : "Simpan perubahan"}
          </button>
        </div>
      </div>
    </form>
  );
}
