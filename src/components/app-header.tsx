import Link from "next/link";
import { BookOpen, Coins, Home, Plus } from "lucide-react";
import { createDraft } from "@/app/comics/actions";
import { createClient } from "@/lib/supabase/server";
import { AccountMenu } from "./account-menu";

export type HeaderUser = { email: string; nama: string; saldo: number };

/** Bar navigasi atas untuk halaman aplikasi (bukan editor yang layar penuh). */
export function AppHeaderView({ user, aktif }: { user: HeaderUser; aktif?: "beranda" }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link href="/dashboard" className="mr-2 flex items-center gap-2 font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-foreground">
            <BookOpen size={18} />
          </span>
          <span className="hidden sm:inline">KomikEdu</span>
        </Link>
        <nav aria-label="Utama" className="flex items-center gap-1 text-sm">
          <Link
            href="/dashboard"
            aria-current={aktif === "beranda" ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${aktif === "beranda" ? "bg-surface-muted font-medium" : "hover:bg-surface-muted"}`}
          >
            <Home size={15} aria-hidden />
            <span className="sr-only sm:not-sr-only">Beranda</span>
          </Link>
          <form action={createDraft}>
            <button type="submit" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 hover:bg-surface-muted">
              <Plus size={15} /> Buat
            </button>
          </form>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-sm" title="Saldo kredit">
            <Coins size={14} className="text-amber-600" />
            {user.saldo}
          </span>
          <AccountMenu email={user.email} nama={user.nama} saldo={user.saldo} />
        </div>
      </div>
    </header>
  );
}

/** Versi yang mengambil data pengguna sendiri. */
export async function AppHeader({ aktif }: { aktif?: "beranda" }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profil } = await supabase.from("users").select("nama, saldo_kredit").eq("id", user.id).single();
  return <AppHeaderView aktif={aktif} user={{ email: user.email ?? "", nama: profil?.nama ?? "", saldo: profil?.saldo_kredit ?? 0 }} />;
}
