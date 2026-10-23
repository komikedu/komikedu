"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, ExternalLink, Globe, Loader2, X } from "lucide-react";
import { perbaruiDeskripsiAksi, tarikAksi, terbitkanAksi } from "@/app/comics/komunitas-actions";
import { MAX_DESKRIPSI } from "@/lib/comics/komunitas-schema";
import { useEditor } from "@/lib/editor/store";

type Status = { terbit: boolean; deskripsi: string };

const PESAN_KONEKSI = "Tidak ada koneksi. Coba lagi.";

/** Unggah satu halaman salinan terbit (JPEG) dengan id penerbitan `rilis`. Mengembalikan pesan galat, atau null bila berhasil. */
async function unggahHalaman(comicId: string, rilis: string, nomor: number, jpeg: Uint8Array): Promise<string | null> {
  try {
    const res = await fetch(`/api/comics/${comicId}/terbit/halaman/${nomor}?rilis=${rilis}`, { method: "PUT", headers: { "content-type": "image/jpeg" }, body: new Blob([jpeg as BlobPart]) });
    const json = (await res.json().catch(() => null)) as { ok: boolean; error?: string } | null;
    return res.ok && json?.ok ? null : (json?.error ?? "Gagal mengunggah halaman. Coba lagi.");
  } catch {
    return PESAN_KONEKSI;
  }
}

/**
 * Tombol Terbitkan di editor. Menerbitkan membuat SALINAN TETAP: tiap halaman dirender di browser menjadi gambar, diunggah,
 * lalu dibaca di web dan diunduh sebagai PDF oleh pembaca. Edit berikutnya tidak mengubah komik publik sampai Anda menekan
 * "Perbarui komik publik". Pemilik harus mencentang pernyataan hak cipta, dan bisa menarik komik kapan saja.
 */
export function TombolTerbit({ comicId, awal, penulis, fontFamily, simpanDulu }: { comicId?: string; awal: Status; penulis: string; fontFamily: string; simpanDulu: () => Promise<boolean> }) {
  const [status, setStatus] = useState<Status>(awal);
  const [buka, setBuka] = useState(false);
  const [deskripsi, setDeskripsi] = useState(awal.deskripsi);
  const [setuju, setSetuju] = useState(false);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);
  const [salin, setSalin] = useState(false);
  /** teks tahap yang sedang berjalan ("Menyiapkan halaman 2/5"), null bila tidak sibuk */
  const [sibuk, setSibuk] = useState<string | null>(null);
  const memproses = sibuk !== null;

  useEffect(() => {
    if (!buka) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !memproses && setBuka(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [buka, memproses]);

  if (!comicId) return null; // pratinjau tanpa komik tersimpan tidak bisa diterbitkan

  const tautan = typeof window === "undefined" ? `/baca/${comicId}` : `${window.location.origin}/baca/${comicId}`;
  const adaGambar = () => useEditor.getState().pages.some((p) => p.panels.some((x) => x.visible && x.imageUrl));

  function bukaDialog() {
    setDeskripsi(status.deskripsi);
    setSetuju(false);
    setPesan(null);
    setSalin(false);
    setBuka(true);
  }

  /** Render semua halaman, unggah, lalu terbitkan. Dipakai untuk terbit pertama dan "Perbarui komik publik". */
  async function terbitkan() {
    setPesan(null);
    if (!adaGambar()) return setPesan({ ok: false, teks: "Buat gambar minimal satu halaman dulu sebelum menerbitkan." });
    try {
      // salinan dirender dari isi editor, tetapi data tersimpan dipakai sebagai acuan di server, jadi simpan dulu
      setSibuk("Menyimpan perubahan...");
      if (!(await simpanDulu())) return setPesan({ ok: false, teks: "Gagal menyimpan perubahan editor. Coba lagi." });

      const pages = useEditor.getState().pages;
      const { renderSemuaHalaman } = await import("./render-halaman");
      const jpegs = await renderSemuaHalaman(pages, fontFamily, (selesai, total) => setSibuk(`Menyiapkan halaman ${Math.min(selesai + 1, total)}/${total}...`));

      const rilis = crypto.randomUUID();
      for (let i = 0; i < jpegs.length; i++) {
        setSibuk(`Mengunggah halaman ${i + 1}/${jpegs.length}...`);
        const galat = await unggahHalaman(comicId!, rilis, i + 1, jpegs[i]);
        if (galat) return setPesan({ ok: false, teks: galat });
      }

      setSibuk("Menerbitkan...");
      const res = await terbitkanAksi(comicId!, { deskripsi, setuju, rilis, jumlah: jpegs.length });
      if (res.ok) {
        setStatus({ terbit: true, deskripsi: res.deskripsi });
        setSetuju(false);
        setPesan({ ok: true, teks: status.terbit ? "Komik publik diperbarui dengan isi terbaru." : "Komik diterbitkan. Siapa saja bisa membacanya lewat tautan di bawah." });
      } else setPesan({ ok: false, teks: res.error });
    } catch (e) {
      console.error("terbitkan gagal", e);
      const gambarGagal = (e instanceof Error && e.message === "GAMBAR_GAGAL") || (e instanceof DOMException && e.name === "SecurityError");
      setPesan({
        ok: false,
        teks: gambarGagal ? "Ada gambar yang tidak bisa dimuat. Periksa koneksi, lalu coba lagi. Bila terus gagal, aturan CORS bucket gambar mungkin belum benar." : "Gagal menerbitkan komik. Coba lagi.",
      });
    } finally {
      setSibuk(null);
    }
  }

  async function simpanDeskripsi() {
    setPesan(null);
    setSibuk("Menyimpan...");
    try {
      const res = await perbaruiDeskripsiAksi(comicId!, deskripsi);
      if (res.ok) {
        setStatus({ terbit: true, deskripsi: res.deskripsi });
        setPesan({ ok: true, teks: "Deskripsi diperbarui." });
      } else setPesan({ ok: false, teks: res.error });
    } catch {
      setPesan({ ok: false, teks: PESAN_KONEKSI });
    } finally {
      setSibuk(null);
    }
  }

  async function tarik() {
    if (!window.confirm("Tarik komik dari komunitas? Salinan publiknya dihapus dan tidak lagi bisa dibaca atau diunduh. Komik tetap utuh di akun Anda dan bisa diterbitkan lagi.")) return;
    setPesan(null);
    setSibuk("Menarik komik...");
    try {
      const res = await tarikAksi(comicId!);
      if (res.ok) {
        setStatus({ terbit: false, deskripsi: res.deskripsi });
        setBuka(false);
      } else setPesan({ ok: false, teks: res.error });
    } catch {
      setPesan({ ok: false, teks: PESAN_KONEKSI });
    } finally {
      setSibuk(null);
    }
  }

  async function salinTautan() {
    try {
      await navigator.clipboard.writeText(tautan);
      setSalin(true);
      setTimeout(() => setSalin(false), 2000);
    } catch {
      setPesan({ ok: false, teks: "Tidak bisa menyalin otomatis. Salin tautan secara manual." });
    }
  }

  const pernyataan = (
    <label className="mt-2 flex cursor-pointer gap-2.5 rounded-lg border border-line p-3 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/5">
      <input type="checkbox" checked={setuju} onChange={(e) => setSetuju(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand)]" />
      <span>Saya berhak memakai materi, teks, dan gambar dalam komik ini (tidak melanggar hak cipta pihak lain) dan isinya pantas dibaca anak SD.</span>
    </label>
  );

  return (
    <>
      <button
        type="button"
        onClick={bukaDialog}
        title={status.terbit ? "Komik ini ada di komunitas" : "Terbitkan ke komunitas"}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${status.terbit ? "border border-brand text-brand hover:bg-brand/5" : "border border-line hover:bg-surface-muted"}`}
      >
        {status.terbit ? <Check size={13} /> : <Globe size={13} />}
        {status.terbit ? "Diterbitkan" : "Terbitkan"}
      </button>

      {buka && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && !memproses && setBuka(false)}>
          <div role="dialog" aria-modal="true" aria-label={status.terbit ? "Komik diterbitkan" : "Terbitkan ke komunitas"} className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-xl bg-surface p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold">{status.terbit ? "Komik ada di komunitas" : "Terbitkan ke komunitas"}</h2>
              <button type="button" aria-label="Tutup" disabled={memproses} onClick={() => setBuka(false)} className="rounded p-1 text-gray-500 hover:bg-surface-muted disabled:opacity-40">
                <X size={18} />
              </button>
            </div>

            {status.terbit ? (
              <>
                <p className="mt-2 text-sm text-gray-600">Siapa saja bisa membaca komik ini tanpa masuk dan mengunduhnya sebagai PDF.</p>
                <div className="mt-3 flex gap-2">
                  <input readOnly value={tautan} aria-label="Tautan baca" onFocus={(e) => e.currentTarget.select()} className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface-muted px-3 text-xs" />
                  <button type="button" onClick={() => void salinTautan()} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 text-xs hover:bg-surface-muted">
                    {salin ? <Check size={13} /> : <Copy size={13} />} {salin ? "Tersalin" : "Salin"}
                  </button>
                  <a href={`/baca/${comicId}`} target="_blank" rel="noopener" aria-label="Buka halaman baca" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line hover:bg-surface-muted">
                    <ExternalLink size={14} />
                  </a>
                  <a href={`/baca/${comicId}/pdf`} download aria-label="Unduh PDF komik publik" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line hover:bg-surface-muted">
                    <Download size={14} />
                  </a>
                </div>
                <p className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
                  Yang tampil di komunitas adalah <strong>salinan saat diterbitkan</strong>. Perubahan yang Anda buat di editor belum ikut sampai Anda menekan Perbarui komik publik.
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-gray-600">
                Komik ini akan tampil di halaman Komunitas: bisa dibaca di web dan diunduh sebagai PDF oleh siapa saja tanpa masuk. Yang dibagikan adalah salinan tetap saat ini. Anda bisa menariknya kapan saja.
              </p>
            )}

            <p className="mt-3 rounded-lg bg-surface-muted p-2.5 text-xs text-gray-700">
              Penulis yang tampil: <span className="font-semibold">{penulis}</span> (nama profil akun Anda).
            </p>

            <label htmlFor="deskripsi-terbit" className="mt-3 block text-xs font-medium text-gray-600">
              Deskripsi singkat (opsional)
            </label>
            <textarea
              id="deskripsi-terbit"
              rows={3}
              maxLength={MAX_DESKRIPSI}
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Mis. Belajar KPK dan FPB lewat petualangan Joko, cocok untuk kelas 5."
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
            />
            <p className="text-right text-[11px] text-gray-500">
              {deskripsi.length}/{MAX_DESKRIPSI}
            </p>

            {status.terbit && <p className="mt-1 text-xs font-medium text-gray-600">Perbarui isi komik publik</p>}
            {pernyataan}

            {sibuk && (
              <p role="status" className="mt-3 flex items-center gap-2 rounded bg-surface-muted p-2 text-xs text-gray-700">
                <Loader2 size={13} className="animate-spin" /> {sibuk}
              </p>
            )}
            {pesan && (
              <p role={pesan.ok ? "status" : "alert"} className={`mt-3 rounded p-2 text-xs ${pesan.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
                {pesan.teks}
              </p>
            )}

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {status.terbit ? (
                <>
                  <button type="button" onClick={() => void tarik()} disabled={memproses} className="mr-auto rounded-lg px-3 py-2 text-sm text-danger hover:bg-red-50 disabled:opacity-40">
                    Tarik dari komunitas
                  </button>
                  <button
                    type="button"
                    onClick={() => void simpanDeskripsi()}
                    disabled={memproses || deskripsi.trim() === status.deskripsi}
                    className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface-muted disabled:opacity-40"
                  >
                    Simpan deskripsi
                  </button>
                  <button type="button" onClick={() => void terbitkan()} disabled={!setuju || memproses} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-40">
                    Perbarui komik publik
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setBuka(false)} disabled={memproses} className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-surface-muted disabled:opacity-40">
                    Batal
                  </button>
                  <button type="button" onClick={() => void terbitkan()} disabled={!setuju || memproses} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-40">
                    Terbitkan
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
