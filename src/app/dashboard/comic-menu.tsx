"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { deleteComic, renameComic } from "@/app/comics/actions";

type Aksi = null | "menu" | "ubah" | "hapus";

/** Menu titik tiga di kartu komik: ubah judul dan hapus. */
export function ComicMenu({ id, judul }: { id: string; judul: string }) {
  const router = useRouter();
  const [aksi, setAksi] = useState<Aksi>(null);
  const [nama, setNama] = useState(judul);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const akar = useRef<HTMLDivElement>(null);

  // menu tertutup saat klik di luar atau tekan Esc
  useEffect(() => {
    if (aksi !== "menu") return;
    const luar = (e: MouseEvent) => !akar.current?.contains(e.target as Node) && setAksi(null);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAksi(null);
    document.addEventListener("mousedown", luar);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", luar);
      document.removeEventListener("keydown", esc);
    };
  }, [aksi]);

  function tutup() {
    setAksi(null);
    setError(null);
  }

  function simpanNama() {
    if (!nama.trim() || nama.trim() === judul) return tutup();
    start(async () => {
      const res = await renameComic(id, nama);
      if (res.ok) {
        tutup();
        router.refresh();
      } else setError(res.error);
    });
  }

  function hapus() {
    start(async () => {
      const res = await deleteComic(id);
      if (res.ok) {
        tutup();
        router.refresh();
      } else setError(res.error);
    });
  }

  return (
    <div ref={akar} className="absolute right-2 top-2 z-10">
      <button
        type="button"
        aria-label={`Menu komik ${judul}`}
        aria-haspopup="menu"
        aria-expanded={aksi === "menu"}
        onClick={() => setAksi(aksi === "menu" ? null : "menu")}
        className="grid h-8 w-8 place-items-center rounded-full bg-surface/90 text-gray-700 shadow ring-1 ring-line hover:bg-surface"
      >
        <MoreVertical size={16} />
      </button>
      {aksi === "menu" && (
        <ul role="menu" className="absolute right-0 mt-1 w-40 overflow-hidden rounded-lg bg-surface py-1 text-sm shadow-lg ring-1 ring-line">
          <li role="none">
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setNama(judul);
                setAksi("ubah");
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface-muted"
            >
              <Pencil size={14} /> Ubah judul
            </button>
          </li>
          <li role="none">
            <button role="menuitem" type="button" onClick={() => setAksi("hapus")} className="flex w-full items-center gap-2 px-3 py-2 text-left text-danger hover:bg-surface-muted">
              <Trash2 size={14} /> Hapus komik
            </button>
          </li>
        </ul>
      )}

      {(aksi === "ubah" || aksi === "hapus") && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && !pending && tutup()}>
          <div role="dialog" aria-modal="true" aria-label={aksi === "ubah" ? "Ubah judul komik" : "Hapus komik"} className="w-full max-w-sm rounded-xl bg-surface p-5 shadow-xl">
            {aksi === "ubah" ? (
              <>
                <h2 className="font-semibold">Ubah judul komik</h2>
                <input
                  autoFocus
                  aria-label="Judul komik"
                  value={nama}
                  maxLength={120}
                  onChange={(e) => setNama(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") simpanNama();
                    if (e.key === "Escape" && !pending) tutup();
                  }}
                  className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-sm"
                />
              </>
            ) : (
              <>
                <h2 className="font-semibold">Hapus komik ini?</h2>
                <p className="mt-2 text-sm text-gray-600">
                  <span className="font-medium text-gray-900">{judul}</span> beserta semua halaman dan gambarnya akan dihapus permanen. Kredit yang sudah terpakai tidak dikembalikan.
                </p>
              </>
            )}
            {error && (
              <p role="alert" className="mt-3 rounded bg-red-50 p-2 text-xs text-red-700">
                {error}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" disabled={pending} onClick={tutup} className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-surface-muted disabled:opacity-40">
                Batal
              </button>
              {aksi === "ubah" ? (
                <button type="button" disabled={pending || !nama.trim()} onClick={simpanNama} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                  {pending ? "Menyimpan..." : "Simpan"}
                </button>
              ) : (
                <button type="button" disabled={pending} onClick={hapus} className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                  {pending ? "Menghapus..." : "Hapus permanen"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
