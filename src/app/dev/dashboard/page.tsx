import { notFound } from "next/navigation";
import { AppHeaderView } from "@/components/app-header";
import { DashboardView } from "@/app/dashboard/dashboard-view";
import type { ComicSummary } from "@/lib/comics/status";

/** Pratinjau beranda dengan data contoh, tanpa login. Hanya ada saat development. */
export default function DevDashboardPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const now = new Date();
  const ago = (min: number) => new Date(now.getTime() - min * 60_000).toISOString();
  const base = { jenjang: 5, status: "draft" as const, adaMateri: false };
  const comics: ComicSummary[] = [
    { ...base, id: "a1", judul: "Petualangan KPK dan FPB", naskah_status: "review", topik: "KPK dan FPB", gaya: "kartun-cerah", created_at: ago(12) },
    { ...base, id: "b2", judul: "Misi Pecahan Senilai", jenjang: 4, naskah_status: "approved", topik: "Pecahan", gaya: "anime-lembut", created_at: ago(180) },
    { ...base, id: "c3", judul: "Bangun Datar di Taman", jenjang: 3, naskah_status: "generating", topik: "Bangun datar", gaya: "buku-cerita", created_at: ago(60 * 26) },
    { ...base, id: "d4", judul: "Komik tanpa judul", naskah_status: "none", topik: null, gaya: null, created_at: ago(60 * 24 * 5) },
    { ...base, id: "e5", judul: "Jam dan Waktu", jenjang: 2, naskah_status: "error", topik: "Jam", gaya: "kartun-cerah", created_at: ago(60 * 24 * 9) },
  ];
  return (
    <div className="min-h-screen bg-surface-muted">
      <AppHeaderView aktif="beranda" user={{ email: "guru@sekolah.sch.id", nama: "Bu Rina", saldo: 13 }} />
      <DashboardView nama="Bu Rina" comics={comics} now={now} />
    </div>
  );
}
