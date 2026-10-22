"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { processMaterial, removeMaterial, saveDraft } from "../../actions";
import { GAYA, MAX_PDF_BYTES, draftErrors, type Draft } from "@/lib/comics/schema";

type Materi = { nama: string; karakter: number } | null;
type SaveState = "idle" | "saving" | "saved" | "error";

const LANGKAH = ["Materi", "Pengaturan", "Gaya dan ringkasan"];

export function WizardForm({
  comicId,
  userId,
  initial,
  materiAwal,
}: {
  comicId: string;
  userId: string;
  initial: Draft;
  materiAwal: Materi;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [materi, setMateri] = useState<Materi>(materiAwal);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const dirty = useRef(false);

  const update = useCallback((patch: Partial<Draft>) => {
    dirty.current = true;
    setSaveState("idle");
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  // autosave 800 ms setelah perubahan terakhir
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(async () => {
      setSaveState("saving");
      const res = await saveDraft(comicId, {
        ...draft,
        topik: draft.topik?.trim() ? draft.topik : null,
        tujuan: draft.tujuan?.trim() ? draft.tujuan : null,
        judul: draft.judul.trim() || "Komik tanpa judul",
      });
      dirty.current = false;
      setSaveState(res.ok ? "saved" : "error");
    }, 800);
    return () => clearTimeout(t);
  }, [draft, comicId]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadMsg(null);
    if (file.type !== "application/pdf") return setUploadMsg({ ok: false, text: "Berkas harus berformat PDF." });
    if (file.size > MAX_PDF_BYTES) return setUploadMsg({ ok: false, text: "Ukuran PDF melebihi 20 MB." });

    setUploading(true);
    const path = `${userId}/${comicId}/${crypto.randomUUID()}.pdf`;
    const { error } = await createClient().storage.from("materials").upload(path, file, { contentType: "application/pdf" });
    if (error) {
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

  const errors = draftErrors(draft, !!materi);
  const step = draft.wizard_step;
  const goto = (n: number) => update({ wizard_step: n });

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Komik baru</h1>
        <span role="status" className="text-xs text-gray-500">
          {saveState === "saving" && "Menyimpan..."}
          {saveState === "saved" && "Draft tersimpan"}
          {saveState === "error" && "Gagal menyimpan"}
        </span>
      </div>

      <ol className="mt-4 flex gap-2 text-sm" aria-label="Langkah">
        {LANGKAH.map((nama, i) => (
          <li
            key={nama}
            aria-current={step === i + 1 ? "step" : undefined}
            className={`flex-1 rounded border px-3 py-2 ${step === i + 1 ? "border-black font-semibold" : "border-gray-300 text-gray-500"}`}
          >
            {i + 1}. {nama}
          </li>
        ))}
      </ol>

      <section className="mt-6 flex flex-col gap-5">
        {step === 1 && (
          <>
            <div className="flex flex-col gap-1">
              <label htmlFor="judul" className="text-sm font-medium">Judul komik</label>
              <input id="judul" value={draft.judul} maxLength={120} onChange={(e) => update({ judul: e.target.value })}
                className="rounded border border-gray-300 px-3 py-2" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="topik" className="text-sm font-medium">Topik pelajaran</label>
              <textarea id="topik" rows={3} maxLength={500} value={draft.topik ?? ""} onChange={(e) => update({ topik: e.target.value })}
                placeholder="Contoh: KPK dan FPB" className="rounded border border-gray-300 px-3 py-2" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Atau unggah materi PDF (opsional)</span>
              <p className="text-xs text-gray-500">Maksimal 20 MB dan 30 halaman. Harus PDF berisi teks, bukan hasil scan.</p>
              {materi ? (
                <div className="flex items-center justify-between rounded border border-gray-300 px-3 py-2 text-sm">
                  <span>{materi.nama} ({materi.karakter.toLocaleString("id-ID")} karakter)</span>
                  <button type="button" onClick={onRemove} className="text-red-700 underline">Hapus</button>
                </div>
              ) : (
                <input type="file" accept="application/pdf" disabled={uploading} onChange={onFile} className="text-sm" />
              )}
              {uploading && <p role="status" className="text-sm text-gray-600">Mengunggah dan membaca PDF...</p>}
              {uploadMsg && (
                <p role={uploadMsg.ok ? "status" : "alert"} className={`text-sm ${uploadMsg.ok ? "text-green-800" : "text-red-700"}`}>
                  {uploadMsg.text}
                </p>
              )}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex flex-col gap-1">
              <label htmlFor="jenjang" className="text-sm font-medium">Kelas</label>
              <select id="jenjang" value={draft.jenjang} onChange={(e) => update({ jenjang: Number(e.target.value) })}
                className="rounded border border-gray-300 px-3 py-2">
                {[1, 2, 3, 4, 5, 6].map((k) => <option key={k} value={k}>SD kelas {k}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Mata pelajaran</span>
              <span className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm">Matematika (mapel lain menyusul)</span>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="tujuan" className="text-sm font-medium">Tujuan pembelajaran (opsional)</label>
              <textarea id="tujuan" rows={3} maxLength={500} value={draft.tujuan ?? ""} onChange={(e) => update({ tujuan: e.target.value })}
                placeholder="Contoh: Siswa dapat menentukan KPK dan FPB dari dua bilangan"
                className="rounded border border-gray-300 px-3 py-2" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="halaman" className="text-sm font-medium">Jumlah halaman: {draft.jumlah_halaman}</label>
              <input id="halaman" type="range" min={4} max={12} value={draft.jumlah_halaman}
                onChange={(e) => update({ jumlah_halaman: Number(e.target.value) })} />
              <span className="text-xs text-gray-500">4 sampai 12 halaman.</span>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Gaya visual</legend>
              {GAYA.map((g) => (
                <label key={g.id} className={`flex cursor-pointer items-start gap-3 rounded border px-3 py-2 ${draft.gaya === g.id ? "border-black" : "border-gray-300"}`}>
                  <input type="radio" name="gaya" checked={draft.gaya === g.id} onChange={() => update({ gaya: g.id })} className="mt-1" />
                  <span>
                    <span className="block font-medium">{g.nama}</span>
                    <span className="block text-xs text-gray-500">{g.deskripsi}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <dl className="rounded bg-gray-50 p-4 text-sm">
              <div className="flex justify-between"><dt>Judul</dt><dd>{draft.judul}</dd></div>
              <div className="flex justify-between"><dt>Topik</dt><dd>{draft.topik?.trim() || (materi ? "Dari PDF" : "-")}</dd></div>
              <div className="flex justify-between"><dt>Kelas</dt><dd>SD kelas {draft.jenjang}</dd></div>
              <div className="flex justify-between"><dt>Halaman</dt><dd>{draft.jumlah_halaman}</dd></div>
              <div className="flex justify-between"><dt>Materi PDF</dt><dd>{materi ? materi.nama : "Tidak ada"}</dd></div>
            </dl>

            {showErrors && errors.length > 0 && (
              <ul role="alert" className="list-disc pl-5 text-sm text-red-700">
                {errors.map((e) => <li key={e}>{e}</li>)}
              </ul>
            )}
          </>
        )}
      </section>

      <div className="mt-8 flex items-center justify-between">
        {step > 1 ? (
          <button type="button" onClick={() => goto(step - 1)} className="rounded border border-gray-300 px-4 py-2">Kembali</button>
        ) : (
          <Link href="/dashboard" className="rounded border border-gray-300 px-4 py-2">Ke dashboard</Link>
        )}
        {step < 3 ? (
          <button type="button" onClick={() => goto(step + 1)} className="rounded bg-black px-4 py-2 font-medium text-white">Lanjut</button>
        ) : errors.length === 0 ? (
          <Link href="/dashboard" className="rounded bg-black px-4 py-2 font-medium text-white">Selesai, simpan draft</Link>
        ) : (
          <button type="button" onClick={() => setShowErrors(true)} className="rounded bg-black px-4 py-2 font-medium text-white">
            Selesai, simpan draft
          </button>
        )}
      </div>
    </main>
  );
}
