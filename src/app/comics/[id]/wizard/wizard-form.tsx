"use client";

import { EditorBackdrop } from "@/components/editor-backdrop";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, FileUp, Loader2, PenLine, Plus, Sparkles, UserPlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NASKAH_COST } from "@/lib/comics/naskah-edit";
import { GAYA, MAX_CERITA, MAX_PDF_BYTES, WIZARD_STEPS, type Draft, type DraftPatch } from "@/lib/comics/schema";
import { MAX_TOKOH, TOKOH_PRESET, fromPreset, gambarTokoh, type Tokoh } from "@/lib/comics/tokoh";
import { processMaterial, removeMaterial, saveDraft } from "../../actions";
import { generateNaskah } from "../naskah/actions";

type Materi = { nama: string; karakter: number } | null;
type SaveState = "idle" | "saving" | "saved" | "error";
type NaskahStatus = "none" | "generating" | "review" | "approved" | "error";

const TOPIK_POPULER = ["KPK dan FPB", "Pecahan senilai", "Bangun datar", "Membaca jam", "Perkalian"];
/** Pilihan jumlah panel per halaman selain Otomatis. */
const PANEL_PER_HALAMAN = [1, 2, 3, 4, 5, 6] as const;
const HALAMAN = [4, 6, 8, 10, 12];

const JUDUL: Record<number, { judul: string; sub: string }> = {
  1: { judul: "Pilih materi pelajaran", sub: "Dari topik singkat atau dokumen PDF yang kamu punya." },
  2: { judul: "Untuk kelas berapa?", sub: "Bahasa dan tingkat kesulitan disesuaikan dengan kelas." },
  3: { judul: "Pilih gaya visual", sub: "Gaya ini dipakai untuk semua gambar di komikmu." },
  4: { judul: "Pilih tokoh cerita", sub: "Tokoh tampil sama di semua halaman. Boleh dilewati, AI akan membuat tokoh sendiri." },
  5: { judul: "Ceritakan alur komikmu", sub: "Apa yang terjadi di cerita? Boleh dikosongkan, AI akan membuat cerita sendiri." },
};

function contohCerita(topik: string, nama: string[]) {
  const t = topik || "materi ini";
  // contoh memakai tokoh yang sudah dipilih, agar langsung bisa dipakai
  const a = nama[0] ?? "Kiki";
  const b = nama[1] ?? "Doni";
  return [
    `${a} dan ${b} membantu ibu di toko kue. Mereka memakai ${t} untuk membagi kue dengan adil.`,
    `${a} menjadi detektif cilik dan memecahkan misteri di perpustakaan sekolah dengan petunjuk tentang ${t}.`,
    `${b} gugup menghadapi lomba matematika antarkelas. ${a} dan teman-temannya membantunya memahami ${t}.`,
  ];
}

/** Kartu pilihan besar, seperti onboarding referensi. */
function Pilihan({ aktif, onClick, children, className = "" }: { aktif: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={aktif}
      onClick={onClick}
      className={`relative rounded-xl border-2 transition ${aktif ? "border-brand bg-brand/5" : "border-line bg-surface hover:border-gray-300"} ${className}`}
    >
      {aktif && (
        <span className="absolute right-2 top-2 z-10 grid h-5 w-5 place-items-center rounded-full bg-brand text-brand-foreground">
          <Check size={12} strokeWidth={3} />
        </span>
      )}
      {children}
    </button>
  );
}

export function WizardForm({
  comicId,
  userId,
  initial,
  materiAwal,
  naskahStatus,
  naskahError,
  saldo,
  simpan = saveDraft,
}: {
  comicId: string;
  userId: string;
  initial: Draft;
  materiAwal: Materi;
  naskahStatus: NaskahStatus;
  naskahError: string | null;
  saldo: number;
  /** Fungsi simpan draft; bisa diganti untuk halaman pratinjau tanpa login. */
  simpan?: (id: string, patch: DraftPatch) => Promise<{ ok: boolean }>;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial);
  const [materi, setMateri] = useState<Materi>(materiAwal);
  const [mode, setMode] = useState<"topik" | "pdf">(materiAwal ? "pdf" : "topik");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(naskahStatus === "error" ? naskahError : null);
  const [tujuanOpen, setTujuanOpen] = useState(!!initial.tujuan);
  const [formTokoh, setFormTokoh] = useState<{ open: boolean; nama: string; deskripsi: string }>({ open: false, nama: "", deskripsi: "" });
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const payload = (d: Draft): DraftPatch => ({
    ...d,
    topik: d.topik?.trim() ? d.topik : null,
    tujuan: d.tujuan?.trim() ? d.tujuan : null,
    cerita: d.cerita?.trim() ? d.cerita : null,
    judul: d.judul.trim() || "Komik tanpa judul",
  });

  const update = useCallback((patch: Partial<Draft>) => {
    dirty.current = true;
    setSaveState("idle");
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  // autosave 700 ms setelah perubahan terakhir
  useEffect(() => {
    if (!dirty.current) return;
    timer.current = setTimeout(async () => {
      setSaveState("saving");
      const res = await simpan(comicId, payload(draft));
      dirty.current = false;
      setSaveState(res.ok ? "saved" : "error");
    }, 700);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, comicId, simpan]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploadMsg(null);
    if (file.type !== "application/pdf") return setUploadMsg({ ok: false, text: "Berkas harus berformat PDF." });
    if (file.size > MAX_PDF_BYTES) return setUploadMsg({ ok: false, text: "Ukuran PDF melebihi 20 MB." });

    setUploading(true);
    const path = `${userId}/${comicId}/${crypto.randomUUID()}.pdf`;
    const { error: upErr } = await createClient().storage.from("materials").upload(path, file, { contentType: "application/pdf" });
    if (upErr) {
      setUploading(false);
      return setUploadMsg({ ok: false, text: "Gagal mengunggah berkas. Coba lagi." });
    }
    const res = await processMaterial(comicId, path);
    setUploading(false);
    if (res.ok) {
      setMateri({ nama: file.name, karakter: res.karakter });
      setUploadMsg({ ok: true, text: `PDF terbaca: ${res.halaman} halaman.` });
    } else {
      setUploadMsg({ ok: false, text: res.error });
    }
  }

  async function onRemove() {
    const res = await removeMaterial(comicId);
    if (res.ok) {
      setMateri(null);
      setUploadMsg(null);
    }
  }

  async function buatNaskah() {
    setError(null);
    setGenerating(true);
    // pastikan cerita dan pengaturan terakhir sudah tersimpan sebelum server membacanya
    if (timer.current) clearTimeout(timer.current);
    const saved = await simpan(comicId, payload(draft));
    dirty.current = false;
    if (!saved.ok) {
      setGenerating(false);
      return setError("Gagal menyimpan pengaturan. Coba lagi.");
    }
    const res = await generateNaskah(comicId);
    if (res.ok) {
      router.push(`/comics/${comicId}/naskah`);
    } else {
      setGenerating(false);
      setError(res.error);
    }
  }

  const tokoh = draft.tokoh_json;
  const dipilih = (id: string) => tokoh.some((t) => t.id === id);
  const toggleTokoh = (t: Tokoh) =>
    update({ tokoh_json: dipilih(t.id) ? tokoh.filter((x) => x.id !== t.id) : tokoh.length < MAX_TOKOH ? [...tokoh, t] : tokoh });
  const tambahTokohSendiri = () => {
    const nama = formTokoh.nama.trim();
    const deskripsi = formTokoh.deskripsi.trim();
    if (!nama || !deskripsi || tokoh.length >= MAX_TOKOH) return;
    update({ tokoh_json: [...tokoh, { id: `sendiri-${crypto.randomUUID().slice(0, 8)}`, nama, peran: "", deskripsi, preset: false }] });
    setFormTokoh({ open: false, nama: "", deskripsi: "" });
  };

  const step = draft.wizard_step;
  const goto = (n: number) => update({ wizard_step: Math.min(WIZARD_STEPS, Math.max(1, n)) });
  const adaMateri = !!materi;
  const bolehLanjut = step === 1 ? !!draft.topik?.trim() || adaMateri : step === 3 ? !!draft.gaya : true;
  const sudahAdaNaskah = naskahStatus === "review" || naskahStatus === "approved" || naskahStatus === "generating";
  const kurangKredit = saldo < NASKAH_COST;
  const { judul, sub } = JUDUL[step];

  return (
    <>
    <EditorBackdrop />
    <main className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-8">
      <div className="rounded-2xl bg-surface shadow-xl ring-1 ring-line">
        <div className="px-5 pb-6 pt-6 sm:px-8">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Langkah {step} dari {WIZARD_STEPS}
            </span>
            <span role="status">
              {saveState === "saving" && "Menyimpan..."}
              {saveState === "saved" && "Draft tersimpan"}
              {saveState === "error" && <span className="text-danger">Gagal menyimpan</span>}
            </span>
          </div>
          <h1 className="mt-3 text-center text-2xl font-bold">{judul}</h1>
          <p className="mt-1 text-center text-gray-600">{sub}</p>

          <div className="mt-6">
            {generating ? (
              <div role="status" className="flex flex-col items-center gap-3 py-10 text-center">
                <Loader2 size={32} className="animate-spin text-brand" />
                <p className="font-medium">Menyusun naskahmu...</p>
                <p className="text-sm text-gray-500">Biasanya 30 sampai 60 detik. Kredit dikembalikan bila gagal.</p>
              </div>
            ) : (
              <>
                {step === 1 && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Pilihan aktif={mode === "topik"} onClick={() => setMode("topik")} className="p-4 text-left">
                        <PenLine size={20} className="text-brand" />
                        <span className="mt-2 block font-semibold">Tulis topik</span>
                        <span className="block text-xs text-gray-500">Cepat, cukup satu kalimat</span>
                      </Pilihan>
                      <Pilihan aktif={mode === "pdf"} onClick={() => setMode("pdf")} className="p-4 text-left">
                        <FileUp size={20} className="text-brand" />
                        <span className="mt-2 block font-semibold">Unggah PDF</span>
                        <span className="block text-xs text-gray-500">Fakta diambil dari materimu</span>
                      </Pilihan>
                    </div>

                    {mode === "topik" ? (
                      <div className="flex flex-col gap-2">
                        <label htmlFor="topik" className="sr-only">
                          Topik pelajaran
                        </label>
                        <textarea
                          id="topik"
                          rows={2}
                          maxLength={500}
                          value={draft.topik ?? ""}
                          onChange={(e) => update({ topik: e.target.value })}
                          placeholder="Contoh: KPK dan FPB"
                          className="rounded-lg border border-line px-3 py-2"
                        />
                        <div className="flex flex-wrap gap-2" aria-label="Topik populer">
                          {TOPIK_POPULER.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => update({ topik: t })}
                              className="rounded-full border border-line px-3 py-1 text-xs hover:border-brand hover:text-brand"
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : materi ? (
                      <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5 text-sm">
                        <span className="min-w-0 truncate">
                          {materi.nama} <span className="text-gray-500">({materi.karakter.toLocaleString("id-ID")} karakter)</span>
                        </span>
                        <button type="button" onClick={onRemove} aria-label="Hapus PDF" className="ml-2 rounded p-1 text-gray-500 hover:bg-surface-muted">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-line px-4 py-6 text-center hover:border-brand">
                        {uploading ? <Loader2 size={20} className="animate-spin text-brand" /> : <FileUp size={20} className="text-gray-500" />}
                        <span className="text-sm font-medium">{uploading ? "Mengunggah dan membaca PDF..." : "Pilih berkas PDF"}</span>
                        <span className="text-xs text-gray-500">Maks. 20 MB dan 30 halaman, berisi teks (bukan hasil scan)</span>
                        <input
                          type="file"
                          accept="application/pdf"
                          disabled={uploading}
                          className="sr-only"
                          onChange={(e) => {
                            void onFile(e.target.files?.[0]);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                    {uploadMsg && (
                      <p role={uploadMsg.ok ? "status" : "alert"} className={`text-sm ${uploadMsg.ok ? "text-emerald-700" : "text-danger"}`}>
                        {uploadMsg.text}
                      </p>
                    )}

                    {tujuanOpen ? (
                      <div className="flex flex-col gap-1">
                        <label htmlFor="tujuan" className="text-sm font-medium">
                          Tujuan pembelajaran
                        </label>
                        <textarea
                          id="tujuan"
                          rows={2}
                          maxLength={500}
                          value={draft.tujuan ?? ""}
                          onChange={(e) => update({ tujuan: e.target.value })}
                          placeholder="Contoh: Siswa dapat menentukan KPK dan FPB dari dua bilangan"
                          className="rounded-lg border border-line px-3 py-2 text-sm"
                        />
                      </div>
                    ) : (
                      <button type="button" onClick={() => setTujuanOpen(true)} className="w-fit text-sm text-brand underline">
                        + Tambah tujuan pembelajaran (opsional)
                      </button>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div className="flex flex-col gap-5">
                    <fieldset>
                      <legend className="sr-only">Kelas</legend>
                      <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3, 4, 5, 6].map((k) => (
                          <Pilihan key={k} aktif={draft.jenjang === k} onClick={() => update({ jenjang: k })} className="px-3 py-4 text-center">
                            <span className="block text-xs text-gray-500">SD</span>
                            <span className="block text-lg font-semibold">Kelas {k}</span>
                          </Pilihan>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset>
                      <legend className="text-sm font-medium">Jumlah halaman</legend>
                      <div className="mt-2 grid grid-cols-5 gap-2">
                        {HALAMAN.map((n) => (
                          <Pilihan key={n} aktif={draft.jumlah_halaman === n} onClick={() => update({ jumlah_halaman: n })} className="py-2 text-center font-semibold">
                            {n}
                          </Pilihan>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-gray-500">Mata pelajaran: Matematika. Gambar nanti memakai 1 kredit per halaman.</p>
                    </fieldset>
                    <fieldset>
                      <legend className="text-sm font-medium">Panel per halaman</legend>
                      <div className="mt-2 grid grid-cols-4 gap-2">
                        <Pilihan aktif={draft.panel_per_halaman === null} onClick={() => update({ panel_per_halaman: null })} className="col-span-2 py-2 text-center font-semibold">
                          Otomatis
                        </Pilihan>
                        {PANEL_PER_HALAMAN.map((n) => (
                          <Pilihan key={n} aktif={draft.panel_per_halaman === n} onClick={() => update({ panel_per_halaman: n })} className="py-2 text-center font-semibold">
                            {n}
                          </Pilihan>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {draft.panel_per_halaman === null
                          ? "Otomatis: AI memilih 2 sampai 4 panel per halaman sesuai isi ceritanya."
                          : draft.panel_per_halaman === 1
                            ? "Satu panel besar per halaman: cocok untuk adegan penuh dan gambar yang detail."
                            : `Setiap halaman dibagi menjadi ${draft.panel_per_halaman} panel. Semakin banyak panel, semakin kecil tiap gambar. Panel tetap bisa ditambah, dihapus, dan diatur ulang di naskah dan editor.`}
                      </p>
                    </fieldset>
                  </div>
                )}

                {step === 3 && (
                  <fieldset>
                    <legend className="sr-only">Gaya visual</legend>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                      {GAYA.map((g) => (
                        <Pilihan key={g.id} aktif={draft.gaya === g.id} onClick={() => update({ gaya: g.id })} className="overflow-hidden text-left">
                          <span className="relative block aspect-[4/3] w-full">
                            <Image src={g.gambar} alt="" fill sizes="(min-width: 640px) 180px, 50vw" className="object-cover" />
                          </span>
                          <span className="block px-2 py-2 sm:px-3">
                            <span className="block text-xs font-semibold sm:text-sm">{g.nama}</span>
                            <span className="hidden text-xs text-gray-500 sm:block">{g.deskripsi}</span>
                          </span>
                        </Pilihan>
                      ))}
                    </div>
                  </fieldset>
                )}

                {step === 4 && (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {TOKOH_PRESET.map((t) => (
                        <Pilihan key={t.id} aktif={dipilih(t.id)} onClick={() => toggleTokoh(fromPreset(t))} className="overflow-hidden text-left">
                          <span className="relative block aspect-square w-full bg-amber-50">
                            <Image src={gambarTokoh(t.id, draft.gaya)} alt="" fill sizes="(min-width: 640px) 130px, 30vw" className="object-cover" />
                          </span>
                          <span className="block px-2 py-1.5">
                            <span className="block truncate text-xs font-semibold sm:text-sm">{t.nama}</span>
                            <span className="block text-[11px] text-gray-500">{t.peran}</span>
                          </span>
                        </Pilihan>
                      ))}
                      {tokoh
                        .filter((t) => !t.preset)
                        .map((t) => (
                          <div key={t.id} className="relative flex flex-col overflow-hidden rounded-xl border-2 border-brand bg-brand/5">
                            <span className="grid aspect-square w-full place-items-center bg-teal-100 text-3xl font-bold text-brand">{t.nama.charAt(0).toUpperCase()}</span>
                            <span className="block px-2 py-1.5">
                              <span className="block truncate text-xs font-semibold sm:text-sm">{t.nama}</span>
                              <span className="block text-[11px] text-gray-500">Buatan sendiri</span>
                            </span>
                            <button
                              type="button"
                              aria-label={`Hapus tokoh ${t.nama}`}
                              onClick={() => toggleTokoh(t)}
                              className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-gray-600 shadow hover:text-danger"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                    </div>
                    <p role="status" className="text-xs text-gray-500">
                      {tokoh.length} dari {MAX_TOKOH} tokoh dipilih{tokoh.length ? `: ${tokoh.map((t) => t.nama).join(", ")}` : ""}
                    </p>

                    {formTokoh.open ? (
                      <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
                        <label htmlFor="nama-tokoh" className="text-sm font-medium">
                          Nama tokoh
                        </label>
                        <input
                          id="nama-tokoh"
                          maxLength={40}
                          value={formTokoh.nama}
                          onChange={(e) => setFormTokoh((f) => ({ ...f, nama: e.target.value }))}
                          placeholder="Contoh: Raka"
                          className="rounded-lg border border-line px-3 py-2 text-sm"
                        />
                        <label htmlFor="deskripsi-tokoh" className="text-sm font-medium">
                          Ciri-ciri
                        </label>
                        <textarea
                          id="deskripsi-tokoh"
                          rows={2}
                          maxLength={300}
                          value={formTokoh.deskripsi}
                          onChange={(e) => setFormTokoh((f) => ({ ...f, deskripsi: e.target.value }))}
                          placeholder="Contoh: anak laki-laki kelas 4, rambut keriting, kulit cokelat, seragam putih-merah, suka bermain bola"
                          className="rounded-lg border border-line px-3 py-2 text-sm"
                        />
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setFormTokoh({ open: false, nama: "", deskripsi: "" })} className="rounded-lg px-3 py-1.5 text-sm hover:bg-surface-muted">
                            Batal
                          </button>
                          <button
                            type="button"
                            disabled={!formTokoh.nama.trim() || !formTokoh.deskripsi.trim() || tokoh.length >= MAX_TOKOH}
                            onClick={tambahTokohSendiri}
                            className="flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground disabled:opacity-50"
                          >
                            <Plus size={14} /> Tambah tokoh
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={tokoh.length >= MAX_TOKOH}
                        onClick={() => setFormTokoh((f) => ({ ...f, open: true }))}
                        className="flex w-fit items-center gap-1.5 text-sm text-brand underline disabled:opacity-50"
                      >
                        <UserPlus size={15} /> Buat tokoh sendiri
                      </button>
                    )}
                  </div>
                )}

                {step === 5 && (
                  <div className="flex flex-col gap-3">
                    <label htmlFor="cerita" className="sr-only">
                      Alur cerita
                    </label>
                    <textarea
                      id="cerita"
                      rows={5}
                      maxLength={MAX_CERITA}
                      value={draft.cerita ?? ""}
                      onChange={(e) => update({ cerita: e.target.value })}
                      placeholder="Contoh: Doni, siswa kelas 5, harus membagi kue untuk teman sekelasnya. Ia belajar FPB bersama Kiki..."
                      className="rounded-lg border border-line px-3 py-2"
                    />
                    <p className="text-right text-xs text-gray-500">
                      {(draft.cerita ?? "").length} / {MAX_CERITA} karakter
                    </p>
                    <p className="text-sm text-gray-600">Butuh inspirasi? Klik salah satu contoh:</p>
                    <div className="flex flex-col gap-2">
                      {contohCerita(draft.topik?.trim() ?? "", tokoh.map((t) => t.nama)).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => update({ cerita: c })}
                          className="rounded-lg border border-line px-3 py-2 text-left text-sm hover:border-brand"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    {sudahAdaNaskah && (
                      <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900">
                        Naskah untuk komik ini sudah dibuat. Buka halaman naskah untuk meninjaunya.
                      </p>
                    )}
                  </div>
                )}

                {step === 1 && !bolehLanjut && <p className="mt-3 text-xs text-gray-500">Isi topik atau unggah PDF untuk lanjut.</p>}
                {step === 3 && !bolehLanjut && <p className="mt-3 text-xs text-gray-500">Pilih satu gaya untuk lanjut.</p>}
              </>
            )}

            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-b-2xl border-t border-line px-5 py-4 sm:px-8">
          <div className="mb-4 flex justify-center gap-1.5" aria-hidden>
            {Array.from({ length: WIZARD_STEPS }, (_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i + 1 === step ? "w-6 bg-brand" : "w-1.5 bg-gray-300"}`} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {step === 1 ? (
              <Link href="/dashboard" className="flex items-center justify-center gap-1 rounded-lg border border-line px-4 py-2.5 text-sm font-medium hover:bg-surface-muted">
                <ArrowLeft size={16} /> Beranda
              </Link>
            ) : (
              <button
                type="button"
                disabled={generating}
                onClick={() => goto(step - 1)}
                className="flex items-center justify-center gap-1 rounded-lg border border-line px-4 py-2.5 text-sm font-medium hover:bg-surface-muted disabled:opacity-50"
              >
                <ArrowLeft size={16} /> Kembali
              </button>
            )}

            {step < WIZARD_STEPS ? (
              <button
                type="button"
                disabled={!bolehLanjut}
                onClick={() => goto(step + 1)}
                className="flex items-center justify-center gap-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
              >
                Lanjut <ArrowRight size={16} />
              </button>
            ) : sudahAdaNaskah ? (
              <Link
                href={`/comics/${comicId}/naskah`}
                className="flex items-center justify-center gap-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Lihat naskah <ArrowRight size={16} />
              </Link>
            ) : (
              <button
                type="button"
                disabled={generating || kurangKredit}
                onClick={() => void buatNaskah()}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
              >
                {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {generating ? "Membuat..." : `Buat naskah · ${NASKAH_COST} kredit`}
              </button>
            )}
          </div>
          {step === WIZARD_STEPS && !sudahAdaNaskah && kurangKredit && (
            <p className="mt-2 text-center text-xs text-danger">
              Kredit tidak cukup. Saldo {saldo}, butuh {NASKAH_COST}.
            </p>
          )}
        </div>
      </div>
    </main>
    </>
  );
}
