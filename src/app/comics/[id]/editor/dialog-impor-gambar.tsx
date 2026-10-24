"use client";

import { Dropdown } from "@/components/dropdown";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, X, XCircle } from "lucide-react";
import { daftarPanel, usulkanPemasangan } from "@/lib/editor/impor-gambar";
import type { EditorPage } from "@/lib/editor/types";

type Status = "menunggu" | "jalan" | "selesai" | "gagal";

const potong = (t: string, n: number) => (t.length > n ? `${t.slice(0, n).trimEnd()}...` : t);

/**
 * Dialog untuk memasang banyak gambar sekaligus (mis. hasil Google Flow atau GPT) ke panel. Gambar bernomor ("1-1.png" =
 * halaman 1 panel 1) langsung dipasang ke panelnya; yang lain mengisi panel kosong berurutan. Guru bisa meninjau dan
 * mengubah tujuan tiap gambar dengan melihat pratinjau dan adegan panelnya sebelum memasang.
 */
export function DialogImporGambar({
  pages,
  berkas,
  mulaiDi,
  onUnggah,
  onTutup,
}: {
  pages: EditorPage[];
  berkas: File[];
  /** panel tempat gambar tanpa nomor mulai dipasang (mis. panel tujuan seret dan lepas) */
  mulaiDi?: string;
  /** pasang satu gambar ke satu panel; kembalikan pesan galat, atau null bila berhasil */
  onUnggah: (panelId: string, file: File) => Promise<string | null>;
  onTutup: () => void;
}) {
  const [urutWaktu, setUrutWaktu] = useState(false);
  const panel = useMemo(() => daftarPanel(pages), [pages]);
  const adegan = useMemo(() => new Map(pages.flatMap((pg) => pg.panels.map((p) => [p.id, p.adegan] as const))), [pages]);

  // tujuan tiap berkas (id panel atau "" = lewati); dihitung ulang dari usulan tiap kali urutan diganti
  const [tujuan, setTujuan] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<Record<number, Status>>({});
  const [galat, setGalat] = useState<string | null>(null);
  const [jalan, setJalan] = useState(false);

  const usulan = useMemo(
    () => usulkanPemasangan(berkas.map((f) => ({ name: f.name, waktu: f.lastModified })), pages, { urutWaktu, mulaiDi }),
    [berkas, pages, urutWaktu, mulaiDi],
  );

  // indeks berkas asli per usulan (usulan diurutkan menurut panel tujuan)
  const indeks = useMemo(() => {
    const dipakai = new Set<number>();
    return usulan.map((u) => {
      const i = berkas.findIndex((f, k) => f.name === u.berkas.name && !dipakai.has(k));
      dipakai.add(i);
      return i;
    });
  }, [usulan, berkas]);

  useEffect(() => {
    const awal: Record<number, string> = {};
    usulan.forEach((u, k) => (awal[indeks[k]] = u.tujuan?.panelId ?? ""));
    setTujuan(awal);
    setStatus({});
    setGalat(null);
  }, [usulan, indeks]);

  // pratinjau gambar; alamatnya dilepas saat dialog ditutup
  const pratinjau = useMemo(() => berkas.map((f) => URL.createObjectURL(f)), [berkas]);
  useEffect(() => () => pratinjau.forEach((u) => URL.revokeObjectURL(u)), [pratinjau]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !jalan && onTutup();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [jalan, onTutup]);

  const pilihan = Object.entries(tujuan).filter(([, p]) => p);
  const jumlahPerPanel = new Map<string, number>();
  for (const [, p] of pilihan) jumlahPerPanel.set(p, (jumlahPerPanel.get(p) ?? 0) + 1);
  const bentrok = [...jumlahPerPanel.values()].some((n) => n > 1);
  const selesai = pilihan.length > 0 && pilihan.every(([i]) => status[Number(i)] === "selesai");

  async function pasang() {
    setGalat(null);
    setJalan(true);
    for (const [i, panelId] of pilihan) {
      const k = Number(i);
      if (status[k] === "selesai") continue;
      setStatus((s) => ({ ...s, [k]: "jalan" }));
      const g = await onUnggah(panelId, berkas[k]);
      setStatus((s) => ({ ...s, [k]: g ? "gagal" : "selesai" }));
      if (g) {
        setGalat(`${berkas[k].name}: ${g}`);
        break;
      }
    }
    setJalan(false);
  }

  const total = pilihan.length;
  const sudah = pilihan.filter(([i]) => status[Number(i)] === "selesai").length;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && !jalan && onTutup()}>
      <div role="dialog" aria-modal="true" aria-label="Pasang banyak gambar" className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-line p-4">
          <div>
            <h2 className="font-semibold">Pasang {berkas.length} gambar ke panel</h2>
            <p className="mt-1 text-xs text-gray-500">
              Nama berkas seperti <b>1-1.png</b> (halaman 1, panel 1) dipasang sesuai nomornya. Yang lain mengisi panel kosong berurutan. Periksa tujuan tiap gambar sebelum memasang.
            </p>
          </div>
          <button type="button" aria-label="Tutup" disabled={jalan} onClick={onTutup} className="rounded p-1 hover:bg-surface-muted disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-line px-4 py-2 text-xs">
          <span className="text-gray-600">Urutan gambar tanpa nomor:</span>
          {(
            [
              [false, "Menurut nama"],
              [true, "Menurut waktu dibuat"],
            ] as const
          ).map(([nilai, label]) => (
            <button key={label} type="button" aria-pressed={urutWaktu === nilai} disabled={jalan} onClick={() => setUrutWaktu(nilai)} className={`rounded-full border px-3 py-1 ${urutWaktu === nilai ? "border-brand bg-brand text-brand-foreground" : "border-line hover:bg-surface-muted"}`}>
              {label}
            </button>
          ))}
        </div>

        <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
          {usulan.map((u, k) => {
            const i = indeks[k];
            const dipilih = tujuan[i] ?? "";
            const ganda = !!dipilih && (jumlahPerPanel.get(dipilih) ?? 0) > 1;
            const st = status[i] ?? "menunggu";
            return (
              <li key={`${u.berkas.name}-${i}`} className="flex items-center gap-3 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pratinjau[i]} alt="" className="h-16 w-16 shrink-0 rounded-lg border border-line object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold" title={u.berkas.name}>
                    {u.berkas.name}
                  </p>
                  <Dropdown
                    aria-label={`Tujuan ${u.berkas.name}`}
                    value={dipilih}
                    disabled={jalan || st === "selesai"}
                    onChange={(e) => setTujuan((t) => ({ ...t, [i]: e.target.value }))}
                    className={`mt-1 w-full rounded-lg border bg-white px-2 py-1.5 text-xs ${ganda ? "border-red-400" : "border-line"}`}
                  >
                    <option value="">Lewati gambar ini</option>
                    {panel.map((p) => (
                      <option key={p.panelId} value={p.panelId}>
                        {`Hal ${p.halaman} · Panel ${p.panel}${p.kosong ? "" : " (ganti gambar)"} — ${potong(adegan.get(p.panelId) ?? "", 48)}`}
                      </option>
                    ))}
                  </Dropdown>
                  <p className={`mt-0.5 text-[11px] ${ganda ? "text-red-600" : "text-gray-500"}`}>
                    {ganda ? "Panel ini dipilih lebih dari satu gambar." : u.catatan ? u.catatan : u.sumber === "nama" ? "Dipasang sesuai nomor di nama berkas." : u.sumber === "urutan" ? "Mengikuti urutan." : ""}
                  </p>
                </div>
                <div className="w-6 shrink-0" aria-live="polite">
                  {st === "jalan" && <Loader2 size={18} className="animate-spin text-brand" />}
                  {st === "selesai" && <CheckCircle2 size={18} className="text-emerald-600" aria-label="Terpasang" />}
                  {st === "gagal" && <XCircle size={18} className="text-red-600" aria-label="Gagal" />}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="space-y-2 border-t border-line p-4">
          {total > 0 && (jalan || sudah > 0) && (
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={sudah}>
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(sudah / total) * 100}%` }} />
              </div>
              <p className="mt-1 text-xs text-gray-600">{jalan ? `Memasang gambar ${Math.min(sudah + 1, total)} dari ${total}...` : `${sudah} dari ${total} gambar terpasang.`}</p>
            </div>
          )}
          {galat && (
            <p role="alert" className="rounded bg-red-50 p-2 text-xs text-red-700">
              {galat}
            </p>
          )}
          {bentrok && !jalan && <p className="text-xs text-red-600">Ada panel yang dipilih lebih dari satu gambar. Ubah tujuannya dulu.</p>}
          <div className="flex justify-end gap-2">
            <button type="button" disabled={jalan} onClick={onTutup} className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-surface-muted disabled:opacity-40">
              {selesai ? "Selesai" : "Batal"}
            </button>
            {!selesai && (
              <button type="button" disabled={jalan || bentrok || total === 0} onClick={() => void pasang()} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground disabled:opacity-40">
                {jalan ? "Memasang..." : galat ? "Coba lagi" : `Pasang ${total} gambar`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
