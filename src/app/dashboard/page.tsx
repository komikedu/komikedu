import { redirect } from "next/navigation";
import { AppHeaderView } from "@/components/app-header";
import type { ComicSummary } from "@/lib/comics/status";
import { halamanThumb } from "@/lib/comics/thumb";
import { ukuranDariBaris } from "@/lib/editor/ukuran-halaman";
import { isAdminEmail } from "@/lib/admin";
import { daftarTerbit } from "@/lib/comics/komunitas";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { DashboardView } from "./dashboard-view";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const [{ data: profil }, { data: rows }, terbit] = await Promise.all([
    supabase.from("users").select("nama, saldo_kredit").eq("id", user.id).single(),
    supabase
      .from("comics")
      .select("id, judul, jenjang, status, naskah_status, topik, gaya, created_at, lebar_halaman, tinggi_halaman, source_materials(id), pages(urutan, panels(urutan, posisi, image_url, tampil))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      // hanya halaman pertama tiap komik, untuk sampul
      .order("urutan", { referencedTable: "pages", ascending: true })
      .limit(1, { referencedTable: "pages" }),
    // komik terbaru di komunitas untuk satu baris di beranda; gagal memuat tidak menghalangi beranda
    daftarTerbit(createAdminClient(), 1).catch(() => null),
  ]);

  const comics: ComicSummary[] = (rows ?? []).map(({ source_materials, pages, ...c }) => ({
    ...(c as Omit<ComicSummary, "adaMateri" | "halaman1">),
    halaman1: halamanThumb((pages as { panels: Parameters<typeof halamanThumb>[0] }[] | null)?.[0]?.panels, ukuranDariBaris(c)),
    adaMateri: Array.isArray(source_materials) ? source_materials.length > 0 : !!source_materials,
  }));

  return (
    <div className="min-h-screen bg-surface-muted">
      <AppHeaderView aktif="beranda" user={{ email: user.email ?? "", nama: profil?.nama ?? "", saldo: profil?.saldo_kredit ?? 0, admin: isAdminEmail(user.email) }} />
      <DashboardView nama={profil?.nama ?? ""} comics={comics} komunitas={terbit?.ok ? terbit.komik.slice(0, 5) : []} />
    </div>
  );
}
