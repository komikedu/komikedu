import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { daftarTerbitTersimpan } from "@/lib/comics/komunitas-cache";
import { adaFilter, bacaFilter, urlKomunitas } from "@/lib/comics/klasifikasi";
import { nomorHalaman } from "@/lib/comics/komunitas-schema";
import { waktuRelatif } from "@/lib/comics/status";
import { FilterKomunitasForm } from "./filter-komunitas";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Komunitas",
  description: "Komik edukasi buatan guru Indonesia. Baca gratis, tanpa perlu masuk.",
};

export default async function KomunitasPage({ searchParams }: { searchParams: Promise<{ halaman?: string; jenjang?: string; tema?: string; bahasa?: string }> }) {
  const query = await searchParams;
  const halaman = nomorHalaman(query.halaman);
  const filter = bacaFilter(query);
  const res = await daftarTerbitTersimpan(halaman, filter);
  const now = new Date();

  return (
    <div className="min-h-screen bg-surface-muted">
      <PublicHeader aktif="komunitas" />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold">Komunitas</h1>
        <p className="mt-1 text-gray-600">Komik edukasi buatan guru. Baca gratis, tanpa perlu masuk.</p>
        <FilterKomunitasForm filter={filter} />

        {!res.ok ? (
          <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {res.error}. Coba muat ulang halaman ini.
          </p>
        ) : res.komik.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-line bg-surface p-10 text-center text-gray-600">
            {halaman > 1
              ? "Tidak ada komik di halaman ini."
              : adaFilter(filter)
                ? "Belum ada komik yang cocok dengan saringan ini. Coba ubah atau hapus saringannya."
                : "Belum ada komik yang diterbitkan. Jadilah yang pertama: terbitkan komikmu dari editor."}
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {res.komik.map((k) => (
              <li key={k.id}>
                <Link href={`/baca/${k.id}`} className="group block">
                  <div className="overflow-hidden rounded-lg bg-surface ring-1 ring-line transition group-hover:ring-2 group-hover:ring-brand">
                    {k.sampul ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={k.sampul} alt="" width={1350} height={1800} loading="lazy" decoding="async" className="aspect-[3/4] h-auto w-full object-cover" />
                    ) : (
                      <div className="grid aspect-[3/4] place-items-center bg-gradient-to-br from-teal-100 to-emerald-50 px-3 text-center text-sm font-semibold text-gray-700">{k.judul}</div>
                    )}
                  </div>
                  <p className="mt-2 truncate text-sm font-medium">{k.judul}</p>
                  <p className="truncate text-xs text-gray-500">
                    {k.penulis} · SD kelas {k.jenjang}
                  </p>
                  <p className="text-xs text-gray-400">{k.diterbitkan ? waktuRelatif(k.diterbitkan, now) : ""}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {res.ok && (halaman > 1 || res.adaLagi) && (
          <nav aria-label="Halaman daftar" className="mt-8 flex items-center justify-center gap-3 text-sm">
            {halaman > 1 && (
              <Link href={urlKomunitas(filter, halaman - 1)} className="flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 hover:bg-surface-muted">
                <ChevronLeft size={15} /> Sebelumnya
              </Link>
            )}
            <span className="text-gray-500">Halaman {halaman}</span>
            {res.adaLagi && (
              <Link href={urlKomunitas(filter, halaman + 1)} className="flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 hover:bg-surface-muted">
                Berikutnya <ChevronRight size={15} />
              </Link>
            )}
          </nav>
        )}
      </main>
    </div>
  );
}
