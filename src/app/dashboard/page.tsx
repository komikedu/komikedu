import { redirect } from "next/navigation";
import { AppHeaderView } from "@/components/app-header";
import type { ComicSummary } from "@/lib/comics/status";
import { createClient } from "@/lib/supabase/server";
import { DashboardView } from "./dashboard-view";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const [{ data: profil }, { data: rows }] = await Promise.all([
    supabase.from("users").select("nama, saldo_kredit").eq("id", user.id).single(),
    supabase
      .from("comics")
      .select("id, judul, jenjang, status, naskah_status, topik, gaya, created_at, source_materials(id)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const comics: ComicSummary[] = (rows ?? []).map(({ source_materials, ...c }) => ({
    ...(c as Omit<ComicSummary, "adaMateri">),
    adaMateri: Array.isArray(source_materials) ? source_materials.length > 0 : !!source_materials,
  }));

  return (
    <div className="min-h-screen bg-surface-muted">
      <AppHeaderView aktif="beranda" user={{ email: user.email ?? "", nama: profil?.nama ?? "", saldo: profil?.saldo_kredit ?? 0 }} />
      <DashboardView nama={profil?.nama ?? ""} comics={comics} />
    </div>
  );
}
