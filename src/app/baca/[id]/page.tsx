import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Download } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { bacaKomikPublikTersimpan } from "@/lib/comics/komunitas-cache";
import { waktuRelatif } from "@/lib/comics/status";
import { ukuranRender } from "@/lib/editor/ukuran-halaman";
import { createClient } from "@/lib/supabase/server";
import { LaporDialog } from "./lapor-dialog";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return { title: "Komik tidak ditemukan" };
  const data = await bacaKomikPublikTersimpan(id);
  if (!data) return { title: "Komik tidak ditemukan" };
  const { komik } = data;
  return {
    title: komik.judul,
    description: komik.deskripsi || `Komik edukasi SD kelas ${komik.jenjang} oleh ${komik.penulis}.`,
    openGraph: { title: komik.judul, description: komik.deskripsi || undefined, type: "article" },
  };
}

export default async function BacaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const data = await bacaKomikPublikTersimpan(id);
  if (!data) notFound();
  const { komik, halaman } = data;

  // hanya untuk menampilkan tombol Laporkan menurut status masuk; pelaporannya sendiri disahkan ulang di server
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <div className="min-h-screen bg-surface-muted">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link href="/komunitas" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-brand">
          <ChevronLeft size={15} /> Komunitas
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{komik.judul}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {komik.penulis} · SD kelas {komik.jenjang}
              {komik.diterbitkan ? ` · ${waktuRelatif(komik.diterbitkan)}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={`/baca/${komik.id}/pdf`}
              download
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand-hover"
            >
              <Download size={13} /> Unduh PDF
            </a>
            <LaporDialog comicId={komik.id} masuk={!!session} />
          </div>
        </div>
        {komik.deskripsi && <p className="mt-3 whitespace-pre-line text-sm text-gray-700">{komik.deskripsi}</p>}

        <ol aria-label="Halaman komik" className="mx-auto mt-6 w-full max-w-[720px] space-y-6">
          {halaman.map((url, i) => (
            <li key={url}>
              {/* salinan tetap yang dibuat saat komik diterbitkan; rasio 3:4 dipasang agar tidak melompat saat dimuat */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Halaman ${i + 1} dari ${halaman.length}`}
                width={ukuranRender(komik.ukuran).lebar}
                height={ukuranRender(komik.ukuran).tinggi}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                className="h-auto w-full rounded-lg bg-white shadow ring-1 ring-black/10"
              />
            </li>
          ))}
        </ol>

        <p className="mt-8 text-center text-xs text-gray-500">Komik ini dibuat dengan bantuan AI dan dibagikan oleh penulisnya. Ada yang tidak pantas atau melanggar hak cipta? Gunakan tombol Laporkan.</p>
      </main>
    </div>
  );
}
