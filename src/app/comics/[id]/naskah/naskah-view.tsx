"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Plus, Trash2, X } from "lucide-react";
import { LAYOUTS } from "@/lib/ai/layouts";
import { MAX_BALLOON_WORDS, type Flag, type Script } from "@/lib/ai/schemas";
import {
  MAX_BALON,
  MAX_PANEL,
  formatAngka,
  gantiLayout,
  hapusBalon,
  hapusPanel,
  layoutHalaman,
  panelBerisi,
  panelTerhapusJikaGantiLayout,
  tambahBalon,
  tambahPanel,
  terimaPerbaikan,
} from "@/lib/comics/naskah";
import { NASKAH_COST } from "@/lib/comics/naskah-edit";
import { GAYA } from "@/lib/comics/schema";
import { approveNaskah, generateNaskah, saveNaskah } from "./actions";

export type NaskahStatus = "none" | "generating" | "review" | "approved" | "error";

type Props = {
  comicId: string;
  judul: string;
  ringkasan: { topik: string | null; jenjang: number; jumlahHalaman: number; gaya: string | null; adaMateri: boolean };
  status: NaskahStatus;
  naskah: Script | null;
  flags: Flag[];
  /** Berubah setiap kali naskah dibuat ulang; dipakai untuk mereset suntingan lokal. */
  versi: string;
  saldo: number;
  adaHalamanEditor: boolean;
  /** Fungsi simpan naskah; bisa diganti untuk halaman pratinjau tanpa login. */
  simpanNaskah?: typeof saveNaskah;
};

const JENIS_LABEL = { bicara: "Bicara", pikir: "Pikir", narasi: "Narasi" } as const;
const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

/** Thumbnail layout halaman (digambar dari koordinat template), seperti pemilih layout di referensi. */
function LayoutThumb({ id, aktif, onClick }: { id: string; aktif: boolean; onClick: () => void }) {
  const l = LAYOUTS.find((x) => x.id === id)!;
  return (
    <button
      type="button"
      aria-pressed={aktif}
      aria-label={`Layout: ${l.nama}`}
      title={l.nama}
      onClick={onClick}
      className={`rounded-md border-2 p-1 transition ${aktif ? "border-brand bg-brand/5" : "border-line bg-surface hover:border-gray-300"}`}
    >
      <svg viewBox="0 0 30 40" className="h-10 w-[30px]" aria-hidden>
        {l.panels.map((r, i) => (
          <rect
            key={i}
            x={1 + r.x * 28}
            y={1 + r.y * 38}
            width={r.w * 28}
            height={r.h * 38}
            rx={0.6}
            strokeWidth={0.8}
            className={aktif ? "fill-brand/15 stroke-brand" : "fill-white stroke-gray-400"}
          />
        ))}
      </svg>
    </button>
  );
}

function Buat({ comicId, saldo, label, onError }: { comicId: string; saldo: number; label: string; onError: (e: string) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const kurang = saldo < NASKAH_COST;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending || kurang}
        onClick={() =>
          start(async () => {
            const res = await generateNaskah(comicId);
            if (!res.ok) onError(res.error);
            router.refresh();
          })
        }
        className="flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
      >
        {pending && <Loader2 size={16} className="animate-spin" />}
        {pending ? "Menyusun naskah..." : `${label} · ${NASKAH_COST} kredit`}
      </button>
      {pending && (
        <p role="status" className="text-sm text-gray-600">
          AI sedang menyusun outline dan naskah, biasanya 30 sampai 60 detik. Kredit dikembalikan bila gagal.
        </p>
      )}
      {kurang && <p className="text-sm text-danger">Kredit tidak cukup. Saldo kamu {saldo}, butuh {NASKAH_COST}.</p>}
    </div>
  );
}

function Generating() {
  const router = useRouter();
  // proses berjalan di server; muat ulang status berkala
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [router]);
  return (
    <div role="status" className="flex items-center gap-3 rounded-lg border border-line p-4 text-sm">
      <Loader2 size={18} className="animate-spin text-brand" />
      Naskah sedang dibuat. Halaman ini diperbarui otomatis.
    </div>
  );
}

function Review({ comicId, naskahAwal, flagsAwal, adaHalamanEditor, saldo, simpanNaskah = saveNaskah }: { comicId: string; naskahAwal: Script; flagsAwal: Flag[]; adaHalamanEditor: boolean; saldo: number; simpanNaskah?: typeof saveNaskah }) {
  const router = useRouter();
  const [naskah, setNaskah] = useState<Script>(naskahAwal);
  const [flags, setFlags] = useState<Flag[]>(flagsAwal);
  const [simpan, setSimpan] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  const [pesan, setPesan] = useState<string | null>(null);
  const [approving, startApprove] = useTransition();
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(async () => {
      setSimpan("saving");
      const res = await simpanNaskah(comicId, naskah);
      dirty.current = false;
      if (res.ok) {
        setFlags(res.flags);
        setSimpan("saved");
      } else {
        setPesan(res.error);
        setSimpan("error");
      }
    }, 700);
    return () => clearTimeout(t);
  }, [naskah, comicId, simpanNaskah]);

  const ubah = (fn: (s: Script) => void) => {
    dirty.current = true;
    setSimpan("dirty");
    setNaskah((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  };

  const ubahStruktur = (fn: (s: Script) => Script) => {
    dirty.current = true;
    setSimpan("dirty");
    setNaskah((prev) => fn(prev));
  };

  const pilihLayout = (h: Script["halaman"][number], id: string) => {
    const hilang = panelTerhapusJikaGantiLayout(h, id);
    if (hilang > 0 && !window.confirm(`${hilang} panel yang sudah berisi akan dihapus. Lanjutkan?`)) return;
    ubahStruktur((s) => gantiLayout(s, h.urutan, id));
  };

  const halaman = [...naskah.halaman].sort((a, b) => a.urutan - b.urutan);
  const belumSiap = flags.length > 0 || simpan === "dirty" || simpan === "saving" || simpan === "error";

  function setujui() {
    if (adaHalamanEditor && !window.confirm("Isi editor saat ini akan diganti dengan halaman dari naskah ini. Lanjutkan?")) return;
    startApprove(async () => {
      const res = await approveNaskah(comicId);
      if (res.ok) router.push(`/comics/${comicId}/editor`);
      else setPesan(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        role="status"
        className={`sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm ${
          flags.length ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"
        }`}
      >
        <span className="flex items-center gap-2">
          {flags.length ? <AlertTriangle size={16} className="text-amber-700" /> : <CheckCircle2 size={16} className="text-emerald-700" />}
          {flags.length ? `${flags.length} tanda perlu ditinjau sebelum naskah disetujui.` : "Semua cek lolos. Tetap baca ulang sebelum dipakai di kelas."}
          <span className="text-xs text-gray-500">
            {simpan === "dirty" && "Belum disimpan..."}
            {simpan === "saving" && "Menyimpan..."}
            {simpan === "saved" && "Tersimpan"}
          </span>
        </span>
        <button
          type="button"
          disabled={belumSiap || approving}
          onClick={setujui}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
        >
          {approving && <Loader2 size={14} className="animate-spin" />}
          Setujui naskah dan buka editor
        </button>
      </div>
      {pesan && (
        <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">
          {pesan}
        </p>
      )}

      {halaman.map((h) => (
        <section key={h.urutan} aria-label={`Halaman ${h.urutan}`} className="rounded-xl border border-line bg-surface p-4">
          <h2 className="text-lg font-semibold">Halaman {h.urutan}</h2>
          <div className="mt-2">
            <p className="text-xs font-medium text-gray-600">Layout panel</p>
            <div role="group" aria-label={`Layout halaman ${h.urutan}`} className="mt-1 flex flex-wrap gap-1.5">
              {LAYOUTS.map((l) => (
                <LayoutThumb key={l.id} id={l.id} aktif={layoutHalaman(h) === l.id} onClick={() => pilihLayout(h, l.id)} />
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-4">
            {[...h.panel]
              .sort((a, b) => a.urutan - b.urutan)
              .map((p) => {
                const panelFlags = flags.filter((f) => f.halaman === h.urutan && f.panel === p.urutan);
                const find = (s: Script) => s.halaman.find((x) => x.urutan === h.urutan)!.panel.find((x) => x.urutan === p.urutan)!;
                return (
                  <div key={p.urutan} className={`rounded-lg border p-3 ${panelFlags.length ? "border-amber-300" : "border-line"}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Panel {p.urutan}</p>
                      {h.panel.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (panelBerisi(p) && !window.confirm(`Hapus panel ${p.urutan} beserta isinya?`)) return;
                            ubahStruktur((s) => hapusPanel(s, h.urutan, p.urutan));
                          }}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 hover:bg-red-50 hover:text-danger"
                        >
                          <Trash2 size={13} /> Hapus panel
                        </button>
                      )}
                    </div>
                    <label className="mt-2 block text-xs font-medium text-gray-600" htmlFor={`adegan-${h.urutan}-${p.urutan}`}>
                      Adegan (untuk gambar, tanpa teks)
                    </label>
                    <textarea
                      id={`adegan-${h.urutan}-${p.urutan}`}
                      rows={2}
                      maxLength={1000}
                      value={p.adegan}
                      onChange={(e) => ubah((s) => void (find(s).adegan = e.target.value))}
                      className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm"
                    />

                    <div className="mt-2 flex flex-col gap-2">
                      {p.dialog.map((d, di) => {
                        const kata = wordCount(d.teks);
                        return (
                          <div key={di} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                            <div className="flex gap-2 sm:w-48 sm:shrink-0">
                              <input
                                aria-label="Nama karakter"
                                value={d.karakter}
                                maxLength={60}
                                onChange={(e) => ubah((s) => void (find(s).dialog[di].karakter = e.target.value))}
                                className="w-full rounded border border-line px-2 py-1 text-sm"
                              />
                              <select
                                aria-label="Jenis balon"
                                value={d.jenis}
                                onChange={(e) => ubah((s) => void (find(s).dialog[di].jenis = e.target.value as typeof d.jenis))}
                                className="rounded border border-line px-1 py-1 text-sm"
                              >
                                {Object.entries(JENIS_LABEL).map(([k, v]) => (
                                  <option key={k} value={k}>
                                    {v}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start gap-1">
                                <textarea
                                  aria-label="Teks balon"
                                  rows={2}
                                  maxLength={300}
                                  value={d.teks}
                                  onChange={(e) => ubah((s) => void (find(s).dialog[di].teks = e.target.value))}
                                  className={`w-full rounded border px-2 py-1 text-sm ${kata > MAX_BALLOON_WORDS || !d.teks.trim() ? "border-amber-400" : "border-line"}`}
                                />
                                <button
                                  type="button"
                                  aria-label="Hapus balon"
                                  title="Hapus balon"
                                  onClick={() => ubahStruktur((s) => hapusBalon(s, h.urutan, p.urutan, di))}
                                  className="mt-1 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-danger"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              <p className={`text-right text-xs ${kata > MAX_BALLOON_WORDS ? "text-amber-700" : "text-gray-400"}`}>
                                {kata} / {MAX_BALLOON_WORDS} kata
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      {p.dialog.length === 0 && <p className="text-xs text-gray-500">Panel tanpa dialog.</p>}
                      {p.dialog.length < MAX_BALON && (
                        <button
                          type="button"
                          onClick={() => ubahStruktur((s) => tambahBalon(s, h.urutan, p.urutan))}
                          className="flex w-fit items-center gap-1 rounded px-2 py-1 text-xs font-medium text-brand hover:bg-brand/5"
                        >
                          <Plus size={13} /> Tambah balon
                        </button>
                      )}
                    </div>

                    {p.hitungan.length > 0 && (
                      <ul className="mt-2 flex flex-col gap-1">
                        {p.hitungan.map((c, ci) => {
                          const flag = panelFlags.find((f) => f.jenis === "hitungan" && f.hitungan === ci);
                          return (
                            <li
                              key={ci}
                              className={`flex flex-wrap items-center justify-between gap-2 rounded px-2 py-1 text-xs ${flag ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"}`}
                            >
                              <span>
                                {flag ? "Hitungan salah" : "Hitungan benar"}: <code>{c.ekspresi}</code> = {formatAngka(c.hasilTertulis)}
                                {flag?.seharusnya !== undefined && <> (seharusnya {formatAngka(flag.seharusnya)})</>}
                                {flag && flag.seharusnya === undefined && <> ({flag.alasan})</>}
                              </span>
                              {flag?.seharusnya !== undefined && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const r = terimaPerbaikan(naskah, h.urutan, p.urutan, ci, flag.seharusnya!);
                                    dirty.current = true;
                                    setSimpan("dirty");
                                    setNaskah(r.script);
                                    if (!r.diganti) setPesan(`Angka di dialog panel ${p.urutan} halaman ${h.urutan} tidak ditemukan. Periksa teksnya secara manual.`);
                                  }}
                                  className="rounded border border-amber-400 bg-white px-2 py-0.5 font-medium hover:bg-amber-100"
                                >
                                  Terima perbaikan
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {panelFlags
                      .filter((f) => f.jenis !== "hitungan")
                      .map((f, i) => (
                        <p key={i} className="mt-1 text-xs text-amber-800">
                          {f.jenis === "panjang-balon" && `${f.alasan}. Persingkat teksnya.`}
                          {f.jenis === "adegan-kosong" && "Adegan panel ini masih kosong. Isi agar gambarnya bisa dibuat."}
                          {f.jenis === "balon-kosong" && "Ada balon yang masih kosong. Isi teksnya atau hapus balonnya."}
                        </p>
                      ))}
                  </div>
                );
              })}
            {h.panel.length < MAX_PANEL && (
              <button
                type="button"
                onClick={() => ubahStruktur((s) => tambahPanel(s, h.urutan))}
                className="flex items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-line py-3 text-sm font-medium text-gray-600 hover:border-brand hover:text-brand"
              >
                <Plus size={16} /> Tambah panel
              </button>
            )}
          </div>
        </section>
      ))}

      <details className="rounded-lg border border-line p-3 text-sm">
        <summary className="cursor-pointer font-medium">Tidak puas dengan naskah ini?</summary>
        <p className="mt-2 text-gray-600">Buat ulang dari awal. Semua suntingan di naskah ini akan hilang.</p>
        <div className="mt-2 max-w-xs">
          <Buat comicId={comicId} saldo={saldo} label="Buat ulang naskah" onError={setPesan} />
        </div>
      </details>
    </div>
  );
}

export function NaskahView(props: Props) {
  const { comicId, judul, ringkasan, status, naskah, flags, versi, saldo, adaHalamanEditor } = props;
  const gaya = GAYA.find((g) => g.id === ringkasan.gaya)?.nama ?? "-";

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">Naskah</p>
          <h1 className="text-2xl font-bold">{judul}</h1>
        </div>
        <Link href={`/comics/${comicId}/wizard`} className="text-sm underline">
          Ubah pengaturan
        </Link>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        SD kelas {ringkasan.jenjang} · {ringkasan.jumlahHalaman} halaman · {gaya} · {ringkasan.adaMateri ? "dari PDF materi" : `topik: ${ringkasan.topik ?? "-"}`} ·
        saldo {saldo} kredit
      </p>

      <div className="mt-6">
        {status === "generating" && <Generating />}

        {status === "review" && naskah && (
          <Review key={versi} comicId={comicId} naskahAwal={naskah} flagsAwal={flags} adaHalamanEditor={adaHalamanEditor} saldo={saldo} simpanNaskah={props.simpanNaskah} />
        )}

        {status === "approved" && (
          <div className="flex flex-col gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <CheckCircle2 size={16} className="text-emerald-700" /> Naskah sudah disetujui dan menjadi halaman di editor.
            </p>
            <Link href={`/comics/${comicId}/editor`} className="w-fit rounded-lg bg-brand px-4 py-2 font-medium text-brand-foreground">
              Buka editor
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
