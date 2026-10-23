"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { fromPreset, gambarTokoh, MAX_TOKOH, TOKOH_PRESET, type Tokoh } from "@/lib/comics/tokoh";
import { undo, useEditor } from "@/lib/editor/store";
import { simpanTokoh } from "./actions";
import { TokohDetail } from "./tokoh-detail";
import { TombolLengkapi } from "./tombol-lengkapi";

function Avatar({ t, gaya, size }: { t: Pick<Tokoh, "id" | "nama" | "preset" | "potret">; gaya: string | null; size: number }) {
  if (!t.preset && t.potret) {
    return (
      <span className="relative shrink-0 overflow-hidden rounded-full bg-surface-muted" style={{ width: size, height: size }}>
        {/* potret di Supabase Storage; unoptimized agar tidak perlu daftar domain gambar */}
        <Image src={t.potret} alt="" fill unoptimized crossOrigin="anonymous" className="object-cover object-top" />
      </span>
    );
  }
  return t.preset ? (
    <span className="relative shrink-0 overflow-hidden rounded-full bg-surface-muted" style={{ width: size, height: size }}>
      <Image src={gambarTokoh(t.id, gaya)} alt="" fill sizes={`${size}px`} className="object-cover object-top" />
    </span>
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-brand/10 font-semibold text-brand" style={{ width: size, height: size }}>
      {t.nama.slice(0, 1).toUpperCase()}
    </span>
  );
}

/**
 * Tab Tokoh di editor: lihat, ganti, tambah, dan hapus tokoh komik. Mengganti tokoh juga mengganti
 * namanya di semua balon dan adegan (satu langkah undo) serta di naskah tersimpan.
 */
export function TokohTab({
  comicId,
  gaya,
  tokoh,
  setTokoh,
  sheet,
  saldo,
  setSaldo,
}: {
  comicId?: string;
  gaya: string | null;
  /** lembar karakter (tokoh yang sudah digambar AI), untuk menawarkan tokoh naskah yang belum ada di daftar */
  sheet: { nama: string; deskripsi: string }[];
  /** disimpan di EditorShell agar tidak hilang saat tab ini ditutup lalu dibuka lagi */
  tokoh: Tokoh[];
  setTokoh: (tokoh: Tokoh[]) => void;
  saldo: number;
  setSaldo: (saldo: number) => void;
}) {
  // indeks tokoh yang sedang diganti, "baru" untuk menambah, null bila pemilih tertutup
  const [pilih, setPilih] = useState<number | "baru" | null>(null);
  const [form, setForm] = useState({ nama: "", deskripsi: "" });
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);
  const [pending, start] = useTransition();
  const gantiNama = useEditor((s) => s.gantiNamaTokoh);
  // tokoh yang dialog detailnya terbuka
  const [buka, setBuka] = useState<string | null>(null);

  const dipakai = (t: Pick<Tokoh, "id" | "nama">, kecuali?: number) =>
    tokoh.some((x, i) => i !== kecuali && (x.id === t.id || x.nama.toLowerCase() === t.nama.toLowerCase()));

  function simpan(next: Tokoh[], lama: Tokoh | null, baru: Tokoh | null) {
    if (!comicId) return;
    const ganti = lama && baru && lama.nama !== baru.nama ? [{ lama: lama.nama, baru: baru.nama }] : [];
    if (ganti.length && !window.confirm(`Ganti "${lama!.nama}" menjadi "${baru!.nama}" di semua balon dan adegan?`)) return;
    setPesan(null);
    start(async () => {
      if (ganti.length) gantiNama(ganti);
      const res = await simpanTokoh(comicId, { tokoh: next, ganti });
      if (res.ok) {
        setTokoh(next);
        setPilih(null);
        setForm({ nama: "", deskripsi: "" });
        setPesan({
          ok: true,
          teks: lama || baru ? "Tokoh tersimpan. Gambar yang sudah ada tidak berubah: buat ulang gambar halaman atau edit panel dengan AI." : "Tokoh tersimpan.",
        });
      } else {
        if (ganti.length) undo();
        setPesan({ ok: false, teks: res.error });
      }
    });
  }

  function pakai(baru: Tokoh) {
    if (pilih === null) return;
    if (pilih === "baru") return simpan([...tokoh, baru], null, null);
    const lama = tokoh[pilih];
    simpan(
      tokoh.map((t, i) => (i === pilih ? baru : t)),
      lama,
      baru,
    );
  }

  function hapus(i: number) {
    if (!window.confirm(`Hapus ${tokoh[i].nama} dari daftar tokoh? Nama di balon dan adegan tidak diubah.`)) return;
    simpan(
      tokoh.filter((_, j) => j !== i),
      null,
      null,
    );
  }

  // tokoh naskah yang sudah digambar AI tapi belum di daftar (mis. komik yang dibuat sebelum tambah otomatis)
  const dariNaskah = sheet.filter((k) => k.nama.trim() && k.deskripsi.trim() && !dipakai({ id: "", nama: k.nama.trim() }));
  const tambahDariNaskah = (k: { nama: string; deskripsi: string }) =>
    simpan(
      [...tokoh, { id: `naskah-${crypto.randomUUID().slice(0, 8)}`, nama: k.nama.trim().slice(0, 40), peran: "", deskripsi: k.deskripsi.trim().slice(0, 300), preset: false }],
      null,
      null,
    );

  const kecuali = typeof pilih === "number" ? pilih : undefined;
  const pilihan = TOKOH_PRESET.filter((p) => !dipakai(p, kecuali));
  const formValid = form.nama.trim() && form.deskripsi.trim() && !dipakai({ id: "", nama: form.nama.trim() }, kecuali);

  return (
    <div className="space-y-4 p-4 text-sm">
      <div>
        <h3 className="font-semibold">Tokoh komik</h3>
        <p className="mt-1 text-xs text-gray-500">Dipakai AI agar wajah dan pakaian tokoh sama di setiap gambar.</p>
      </div>

      {tokoh.length === 0 && <p className="rounded-lg bg-surface-muted p-3 text-xs text-gray-600">Belum ada tokoh dipilih. AI akan membuat tokoh sendiri dari naskah.</p>}
      <ul className="space-y-2">
        {tokoh.map((t, i) => (
          <li key={t.id} className={`flex items-center gap-3 rounded-lg border p-2 ${pilih === i ? "border-brand" : "border-line"}`}>
            <Avatar t={t} gaya={gaya} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{t.nama}</p>
              <p className="truncate text-xs text-gray-500">{t.preset ? t.peran : t.potret ? "Tokoh buatan sendiri" : "Belum ada potret"}</p>
            </div>
            <button
              type="button"
              title={`Detail, gambar, dan deskripsi ${t.nama}`}
              aria-label={`Detail ${t.nama}`}
              disabled={!comicId}
              onClick={() => setBuka(t.id)}
              className="rounded p-1.5 text-gray-600 hover:bg-surface-muted disabled:opacity-40"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              title={`Ganti ${t.nama}`}
              aria-label={`Ganti ${t.nama}`}
              disabled={!comicId || pending}
              onClick={() => setPilih(pilih === i ? null : i)}
              className="rounded p-1.5 text-gray-600 hover:bg-surface-muted disabled:opacity-40"
            >
              <RefreshCw size={15} />
            </button>
            <button
              type="button"
              title={`Hapus ${t.nama}`}
              aria-label={`Hapus ${t.nama}`}
              disabled={!comicId || pending}
              onClick={() => hapus(i)}
              className="rounded p-1.5 text-danger hover:bg-surface-muted disabled:opacity-40"
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>
      {tokoh.length < MAX_TOKOH && pilih === null && (
        <button
          type="button"
          disabled={!comicId || pending}
          onClick={() => setPilih("baru")}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line px-3 py-2 text-xs hover:border-brand hover:text-brand disabled:opacity-40"
        >
          <Plus size={14} /> Tambah tokoh
        </button>
      )}
      {!comicId && <p className="text-xs text-gray-500">Hanya tersedia di komik yang tersimpan.</p>}

      {pilih === null && dariNaskah.length > 0 && (
        <div className="space-y-2 border-t border-line pt-3">
          <div>
            <p className="font-semibold">Tokoh lain di naskah</p>
            <p className="mt-0.5 text-xs text-gray-500">Sudah digambar AI. Tambahkan ke daftar agar bisa diganti atau dipakai lagi dengan wajah yang sama.</p>
          </div>
          <ul className="space-y-2">
            {dariNaskah.map((k) => (
              <li key={k.nama} className="flex items-center gap-3 rounded-lg border border-dashed border-line p-2">
                <Avatar t={{ id: "", nama: k.nama, preset: false }} gaya={gaya} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{k.nama}</p>
                  <p className="line-clamp-2 text-[11px] text-gray-500">{k.deskripsi}</p>
                </div>
                <button
                  type="button"
                  disabled={!comicId || pending || tokoh.length >= MAX_TOKOH}
                  onClick={() => tambahDariNaskah(k)}
                  className="shrink-0 rounded-lg border border-line px-2 py-1 text-xs hover:border-brand hover:text-brand disabled:opacity-40"
                >
                  Tambahkan
                </button>
              </li>
            ))}
          </ul>
          {tokoh.length >= MAX_TOKOH && <p className="text-xs text-amber-700">Daftar sudah {MAX_TOKOH} tokoh. Hapus satu tokoh untuk menambah yang lain.</p>}
        </div>
      )}

      {pilih !== null && (
        <div className="rounded-lg border border-brand p-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{pilih === "baru" ? "Tambah tokoh" : `Ganti ${tokoh[pilih].nama} dengan`}</p>
            <button type="button" aria-label="Tutup" onClick={() => setPilih(null)} className="rounded p-1 text-gray-500 hover:bg-surface-muted">
              <X size={14} />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {pilihan.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={pending}
                onClick={() => pakai(fromPreset(p))}
                className="flex flex-col items-center gap-1 rounded-lg border border-line p-2 text-xs hover:border-brand disabled:opacity-40"
              >
                <Avatar t={{ id: p.id, nama: p.nama, preset: true }} gaya={gaya} size={52} />
                <span className="font-medium">{p.nama}</span>
                <span className="text-[10px] text-gray-500">{p.peran}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-2 border-t border-line pt-3">
            <p className="text-xs font-medium text-gray-600">Atau tokoh buatan sendiri</p>
            <input
              aria-label="Nama tokoh"
              maxLength={40}
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="Nama, mis. Ucok"
              className="w-full rounded border border-line px-2 py-1.5 text-xs"
            />
            <textarea
              aria-label="Deskripsi tokoh"
              rows={2}
              maxLength={300}
              value={form.deskripsi}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
              placeholder="Ciri visual, mis. anak laki-laki 10 tahun, rambut keriting, kaos hijau"
              className="w-full rounded border border-line px-2 py-1.5 text-xs"
            />
            {comicId && <TombolLengkapi comicId={comicId} nama={form.nama} deskripsi={form.deskripsi} onHasil={(d) => setForm({ ...form, deskripsi: d })} disabled={pending} />}
            <button
              type="button"
              disabled={!formValid || pending}
              onClick={() =>
                pakai({ id: `sendiri-${crypto.randomUUID().slice(0, 8)}`, nama: form.nama.trim(), peran: "", deskripsi: form.deskripsi.trim(), preset: false })
              }
              className="w-full rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              Pakai tokoh ini
            </button>
          </div>
        </div>
      )}

      {buka && comicId && (
        <TokohDetail comicId={comicId} tokohId={buka} tokoh={tokoh} setTokoh={setTokoh} gaya={gaya} saldo={saldo} setSaldo={setSaldo} onClose={() => setBuka(null)} />
      )}

      {pending && (
        <p role="status" className="flex items-center gap-2 text-xs text-gray-600">
          <Loader2 size={13} className="animate-spin" /> Menyimpan tokoh...
        </p>
      )}
      {pesan && (
        <p role={pesan.ok ? "status" : "alert"} className={`rounded p-2 text-xs ${pesan.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {pesan.teks}
        </p>
      )}
    </div>
  );
}
