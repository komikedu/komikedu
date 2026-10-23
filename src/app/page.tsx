import Image from "next/image";
import Link from "next/link";
import { Comic_Neue } from "next/font/google";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  Check,
  FileText,
  LayoutTemplate,
  MessageSquareText,
  PenLine,
  Share2,
  Sparkles,
} from "lucide-react";
import { HeroComic } from "@/components/landing/hero-comic";
import { GAYA } from "@/lib/comics/schema";
import { createClient } from "@/lib/supabase/server";

const comicFont = Comic_Neue({ weight: ["700"], subsets: ["latin"], display: "swap" });

const FITUR = [
  {
    icon: FileText,
    judul: "Mulai dari materi, bukan dari prompt gambar",
    isi: "Tulis topik atau unggah PDF materi. AI menyusun alur cerita dan naskah per panel yang sesuai kelas.",
  },
  {
    icon: Calculator,
    judul: "Setiap hitungan dicek otomatis",
    isi: "Angka di naskah diverifikasi dengan kalkulator, bukan ditebak AI. Yang salah ditandai, dan perbaikannya tinggal satu klik.",
  },
  {
    icon: MessageSquareText,
    judul: "Teks selalu rapi dan bisa diedit",
    isi: "AI hanya menggambar adegan. Dialog berbahasa Indonesia tetap jadi teks yang bisa diubah kapan saja, tidak rusak di dalam gambar.",
  },
  {
    icon: PenLine,
    judul: "Kamu yang pegang ceritanya",
    isi: "Tulis alur sendiri atau biarkan AI yang membuat. Naskah ditinjau dan disetujui dulu sebelum kredit gambar terpakai.",
  },
  {
    icon: LayoutTemplate,
    judul: "Layout panel dan gaya visual",
    isi: "Pilih tata letak panel per halaman dan gaya gambar yang cocok untuk kelasmu: kartun, anime, atau buku cerita.",
  },
  {
    icon: Share2,
    judul: "Kuis dan tautan untuk siswa",
    isi: "Kuis otomatis di akhir komik, tautan baca untuk HP siswa, dan ekspor PDF.",
    segera: true,
  },
];

const HARGA = [
  {
    nama: "Gratis",
    harga: "Rp0",
    periode: "",
    kredit: "15 kredit saat daftar",
    cukup: "Cukup untuk 1 komik 8 halaman",
    poin: ["Topik atau PDF materi", "Cek hitungan otomatis", "Editor panel dan balon"],
    aktif: true,
  },
  {
    nama: "Guru Bulanan",
    harga: "Rp49.000",
    periode: "/bulan",
    kredit: "40 kredit per bulan",
    cukup: "Sekitar 3 komik per bulan",
    poin: ["Semua fitur Gratis", "Kredit baru setiap bulan", "Bayar dengan QRIS atau e-wallet"],
    sorot: true,
  },
  {
    nama: "Sekolah",
    harga: "Rp349.000",
    periode: "",
    kredit: "300 kredit",
    cukup: "20+ komik untuk beberapa guru",
    poin: ["Semua fitur Gratis", "Cocok untuk satu sekolah", "Bayar dengan QRIS, e-wallet, atau VA"],
  },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const masuk = !!user;
  const ctaHref = masuk ? "/dashboard" : "/login";
  const ctaLabel = masuk ? "Buka dashboard" : "Mulai gratis";

  return (
    <div className="bg-surface text-foreground">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-foreground">
              <BookOpen size={18} />
            </span>
            KomikEdu
          </Link>
          <nav aria-label="Bagian halaman" className="ml-6 hidden items-center gap-6 text-sm text-gray-700 md:flex">
            <a href="#cara-kerja" className="hover:text-brand">
              Cara kerja
            </a>
            <a href="#fitur" className="hover:text-brand">
              Fitur
            </a>
            <a href="#harga" className="hover:text-brand">
              Harga
            </a>
            <Link href="/komunitas" className="hover:text-brand">
              Komunitas
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {masuk ? (
              <Link href="/dashboard" className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover">
                Dashboard <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-surface-muted">
                  Masuk
                </Link>
                <Link href="/login" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover">
                  Mulai gratis
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-teal-50 via-surface to-surface">
          <div
            aria-hidden
            className="absolute inset-0 opacity-40 [background-image:radial-gradient(#0f766e22_1px,transparent_1px)] [background-size:18px_18px]"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 md:grid-cols-2 md:py-20">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-medium text-brand">
                <Sparkles size={13} /> Untuk guru SD · Matematika
              </p>
              <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Ubah materi pelajaran jadi komik edukasi dengan AI</h1>
              <p className="mt-4 text-lg text-gray-600">
                Dari topik atau PDF materi menjadi komik bergambar dengan dialog berbahasa Indonesia, hitungan yang dicek otomatis, dan cerita yang
                kamu tentukan. Tanpa perlu menggambar.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href={ctaHref}
                  className="flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 font-semibold text-brand-foreground shadow-lg shadow-teal-900/10 hover:bg-brand-hover"
                >
                  {ctaLabel} <ArrowRight size={18} />
                </Link>
                {!masuk && <span className="text-center text-sm text-gray-500 sm:text-left">Gratis 15 kredit, cukup untuk satu komik.</span>}
              </div>
              <ul className="mt-8 grid gap-2 text-sm text-gray-700 sm:grid-cols-3">
                {["Tanpa bisa menggambar", "Hitungan dicek otomatis", "Teks bisa diedit"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check size={15} className="text-brand" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <HeroComic fontClass={comicFont.className} />
          </div>
        </section>

        {/* Cara kerja */}
        <section id="cara-kerja" className="scroll-mt-16 border-t border-line bg-surface-muted py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold tracking-tight">Tiga langkah, tanpa ribet</h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-gray-600">Satu komik 8 halaman bisa selesai dalam satu sesi persiapan mengajar.</p>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              <li className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
                <p className="text-sm font-semibold text-brand">Langkah 1</p>
                <h3 className="mt-1 text-lg font-semibold">Pilih materi dan gaya</h3>
                <p className="mt-1 text-sm text-gray-600">Tulis topik atau unggah PDF, pilih kelas, jumlah halaman, dan gaya gambar.</p>
                <div className="mt-4 grid grid-cols-3 gap-2" aria-hidden>
                  {GAYA.map((g) => (
                    <div key={g.id} className="overflow-hidden rounded-lg ring-1 ring-line">
                      <Image src={g.gambar} alt="" width={160} height={120} className="aspect-[4/3] w-full object-cover" />
                      <p className="truncate px-1.5 py-1 text-[11px] font-medium">{g.nama}</p>
                    </div>
                  ))}
                </div>
              </li>
              <li className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
                <p className="text-sm font-semibold text-brand">Langkah 2</p>
                <h3 className="mt-1 text-lg font-semibold">Tulis cerita, tinjau naskah</h3>
                <p className="mt-1 text-sm text-gray-600">Ceritakan alurnya atau biarkan AI. Periksa naskah per panel, lalu setujui.</p>
                <div className="mt-4 space-y-2 rounded-lg border border-line p-3 text-xs" aria-hidden>
                  <p className="font-semibold">Panel 2</p>
                  <p className="rounded border border-line px-2 py-1.5">Sari: Kelilingnya 3 + 4 + 5 = 12 meter!</p>
                  <p className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-emerald-800">
                    <Check size={12} /> Hitungan benar: 3 + 4 + 5 = 12
                  </p>
                </div>
              </li>
              <li className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
                <p className="text-sm font-semibold text-brand">Langkah 3</p>
                <h3 className="mt-1 text-lg font-semibold">Rapikan di editor</h3>
                <p className="mt-1 text-sm text-gray-600">Geser balon dialog, ubah teks, atur layout panel. Semua perubahan tersimpan otomatis.</p>
                <div className="relative mt-4 overflow-hidden rounded-lg ring-1 ring-line" aria-hidden>
                  <Image src="/landing/halaman-contoh.webp" alt="" width={360} height={482} className="h-36 w-full object-cover object-top" />
                  <span
                    className={`absolute left-3 top-3 max-w-[60%] rounded-[50%] border-2 border-black bg-white px-5 py-2 text-center text-[10px] font-bold leading-tight outline outline-2 outline-offset-4 outline-dashed outline-brand ${comicFont.className}`}
                  >
                    Ayo cari KPK-nya!
                  </span>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* Fitur */}
        <section id="fitur" className="scroll-mt-16 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold tracking-tight">Dibuat khusus untuk komik pelajaran</h2>
            <p className="mx-auto mt-2 max-w-2xl text-center text-gray-600">
              Alat komik AI umum dimulai dari prompt gambar. KomikEdu dimulai dari materi, dan menjaga isi pelajaran tetap akurat.
            </p>
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FITUR.map(({ icon: Icon, judul, isi, segera }) => (
                <li key={judul} className="rounded-2xl border border-line p-5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand">
                    <Icon size={20} />
                  </span>
                  <h3 className="mt-3 font-semibold">
                    {judul}
                    {segera && <span className="ml-2 rounded-full bg-surface-muted px-2 py-0.5 align-middle text-xs font-normal text-gray-500">segera</span>}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">{isi}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Harga */}
        <section id="harga" className="scroll-mt-16 border-t border-line bg-surface-muted py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold tracking-tight">Harga</h2>
            <p className="mx-auto mt-2 max-w-2xl text-center text-gray-600">
              Bayar sesuai pemakaian dengan kredit. Naskah 2 kredit per komik, gambar 1 kredit per halaman. Edit dan ekspor gratis.
            </p>
            <div className="mt-10 grid items-start gap-5 md:grid-cols-3">
              {HARGA.map((p) => (
                <div key={p.nama} className={`relative rounded-2xl bg-surface p-6 ${p.sorot ? "shadow-lg ring-2 ring-brand" : "shadow-sm ring-1 ring-line"}`}>
                  {p.sorot && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-0.5 text-xs font-medium text-brand-foreground">
                      Paling cocok untuk guru
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-brand">{p.nama}</h3>
                  <p className="mt-2">
                    <span className="text-3xl font-bold">{p.harga}</span>
                    <span className="text-sm text-gray-500">{p.periode}</span>
                  </p>
                  <p className="mt-1 text-sm font-medium">{p.kredit}</p>
                  <p className="text-sm text-gray-500">{p.cukup}</p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {p.poin.map((t) => (
                      <li key={t} className="flex items-start gap-2">
                        <Check size={16} className="mt-0.5 shrink-0 text-brand" /> {t}
                      </li>
                    ))}
                  </ul>
                  {p.aktif ? (
                    <Link
                      href={ctaHref}
                      className="mt-6 flex items-center justify-center gap-1.5 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold hover:bg-surface-muted"
                    >
                      {masuk ? "Buka dashboard" : "Mulai gratis"} <ArrowRight size={15} />
                    </Link>
                  ) : (
                    <button type="button" disabled className="mt-6 w-full rounded-lg bg-surface-muted px-4 py-2.5 text-sm font-semibold text-gray-400">
                      Segera hadir
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-gray-500">Pembayaran segera hadir. Harga dapat berubah sebelum peluncuran.</p>
          </div>
        </section>

        {/* Ajakan akhir */}
        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Siap membuat komik pertamamu?</h2>
            <p className="mt-2 text-gray-600">Mulai dari topik pelajaran minggu ini. Gratis untuk komik pertama.</p>
            <Link
              href={ctaHref}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 font-semibold text-brand-foreground hover:bg-brand-hover"
            >
              {ctaLabel} <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-sm text-gray-500 sm:flex-row">
          <p className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-brand text-brand-foreground">
              <BookOpen size={13} />
            </span>
            KomikEdu
          </p>
          <p>© 2026 KomikEdu. Komik edukasi untuk guru Indonesia.</p>
        </div>
      </footer>
    </div>
  );
}
