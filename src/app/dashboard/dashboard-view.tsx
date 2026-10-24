import Link from "next/link";
import { ChevronRight, LayoutTemplate, Sparkles } from "lucide-react";
import { createDraft } from "@/app/comics/actions";
import { PageThumb } from "@/components/page-thumb";
import { ComicMenu } from "./comic-menu";
import type { KartuKomunitas } from "@/lib/comics/komunitas";
import { nextStep, waktuRelatif, type ComicSummary, type NextStep } from "@/lib/comics/status";

const TONE: Record<NextStep["tone"], string> = {
  neutral: "bg-gray-100 text-gray-700",
  progress: "bg-sky-100 text-sky-800",
  attention: "bg-amber-100 text-amber-900",
  done: "bg-emerald-100 text-emerald-800",
};

const COVER_COLORS = ["from-teal-200 to-emerald-100", "from-sky-200 to-indigo-100", "from-amber-200 to-orange-100", "from-rose-200 to-pink-100", "from-violet-200 to-fuchsia-100"];

function coverColor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COVER_COLORS[h % COVER_COLORS.length];
}

/** Sampul: thumbnail halaman 1 bila sudah ada gambar, kalau belum warna tetap per komik dan judulnya. */
function Cover({ comic, small }: { comic: ComicSummary; small?: boolean }) {
  if (comic.halaman1) {
    return (
      <div className={`overflow-hidden rounded-lg ${small ? "h-14 w-11" : "w-full"}`}>
        <PageThumb halaman={comic.halaman1} />
      </div>
    );
  }
  return (
    <div
      aria-hidden
      className={`grid place-items-center overflow-hidden rounded-lg bg-gradient-to-br ${coverColor(comic.id)} ${small ? "h-14 w-11" : "aspect-[3/4] w-full"}`}
    >
      {!small && <span className="line-clamp-3 px-3 text-center text-sm font-semibold text-gray-800/80">{comic.judul}</span>}
    </div>
  );
}

function Badge({ step }: { step: NextStep }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE[step.tone]}`}>{step.badge}</span>;
}

/** Kolom yang terlihat per lebar layar; kartu di atas jumlah itu disembunyikan supaya selalu satu baris. */
const KOLOM_TAMPIL = ["", "", "hidden sm:block", "hidden md:block", "hidden lg:block"];

/** Satu baris komik terbaru dari komunitas, tautan ke halaman baca dan ke daftar lengkap. */
function BarisKomunitas({ komik, now }: { komik: KartuKomunitas[]; now?: Date }) {
  const tampil = komik.slice(0, KOLOM_TAMPIL.length);
  return (
    <section aria-labelledby="dari-komunitas" className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 id="dari-komunitas" className="text-sm font-semibold text-gray-700">
          Dari komunitas
        </h2>
        <Link href="/komunitas" className="flex items-center gap-0.5 text-sm text-brand hover:underline">
          Lihat semua <ChevronRight size={14} />
        </Link>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {tampil.map((k, i) => (
          <li key={k.id} className={KOLOM_TAMPIL[i]}>
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
                {k.diterbitkan ? ` · ${waktuRelatif(k.diterbitkan, now)}` : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DashboardView({ nama, comics, komunitas = [], now }: { nama: string; comics: ComicSummary[]; /** komik terbit terbaru dari komunitas; kosong = bagian ini tidak ditampilkan */ komunitas?: KartuKomunitas[]; now?: Date }) {
  const terakhir = comics[0];
  const stepTerakhir = terakhir ? nextStep(terakhir) : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section aria-labelledby="sapaan">
        <h1 id="sapaan" className="text-3xl font-bold">
          Selamat datang{nama ? `, ${nama}` : ""}
        </h1>
        <p className="mt-1 text-gray-600">Ubah materi pelajaran menjadi komik edukasi, tanpa perlu menggambar.</p>
        <p className="mt-0.5 text-sm text-gray-500">{comics.length ? `Kamu punya ${comics.length} komik.` : "Belum ada komik."}</p>
      </section>

      {terakhir && stepTerakhir && (
        <section aria-labelledby="lanjutkan" className="mt-8">
          <h2 id="lanjutkan" className="text-sm font-semibold text-gray-700">
            Lanjutkan
          </h2>
          <Link
            href={stepTerakhir.href}
            className="mt-2 flex max-w-xl items-center gap-4 rounded-xl border border-line bg-surface p-3 hover:border-brand hover:shadow-sm"
          >
            <Cover comic={terakhir} small />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{terakhir.judul}</p>
              <p className="mt-0.5 flex items-center gap-2 text-sm text-gray-500">
                <Badge step={stepTerakhir} /> {stepTerakhir.aksi}
              </p>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </Link>
        </section>
      )}

      <section aria-labelledby="buat" className="mt-8">
        <h2 id="buat" className="text-sm font-semibold text-gray-700">
          Buat
        </h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <form action={createDraft}>
            <button type="submit" className="flex h-full w-full items-start gap-3 rounded-xl border border-line bg-surface p-4 text-left hover:border-brand hover:shadow-sm">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                <Sparkles size={18} />
              </span>
              <span>
                <span className="block font-semibold">Komik baru</span>
                <span className="mt-0.5 block text-sm text-gray-600">Dari topik atau PDF materi. AI menyusun naskah, kamu meninjau, lalu gambar dibuat.</span>
              </span>
            </button>
          </form>
          <div aria-disabled className="flex items-start gap-3 rounded-xl border border-dashed border-line p-4 text-gray-400">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-muted">
              <LayoutTemplate size={18} />
            </span>
            <span>
              <span className="block font-semibold">
                Template topik <span className="ml-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-normal">segera</span>
              </span>
              <span className="mt-0.5 block text-sm">Topik Matematika SD siap pakai: pecahan, bangun datar, KPK dan FPB.</span>
            </span>
          </div>
        </div>
      </section>

      <section aria-labelledby="komik-saya" className="mt-10">
        <h2 id="komik-saya" className="text-sm font-semibold text-gray-700">
          Komik saya
        </h2>
        {comics.length ? (
          <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {comics.map((c) => {
              const step = nextStep(c);
              return (
                <li key={c.id} className="relative">
                  <ComicMenu id={c.id} judul={c.judul} />
                  <Link href={step.href} className="group block">
                    <div className="rounded-lg ring-1 ring-line transition group-hover:ring-2 group-hover:ring-brand">
                      <Cover comic={c} />
                    </div>
                    <p className="mt-2 truncate text-sm font-medium">{c.judul}</p>
                    <p className="text-xs text-gray-500">
                      SD kelas {c.jenjang} · {waktuRelatif(c.created_at, now)}
                    </p>
                    <p className="mt-1">
                      <Badge step={step} />
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-line p-8 text-center text-sm text-gray-600">
            Komik pertamamu akan muncul di sini. Mulai dengan <span className="font-medium">Komik baru</span> di atas.
          </div>
        )}
      </section>

      {komunitas.length > 0 && <BarisKomunitas komik={komunitas} now={now} />}
    </main>
  );
}
