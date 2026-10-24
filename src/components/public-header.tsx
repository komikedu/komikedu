import Link from "next/link";
import { ArrowRight, BookOpen, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

/** Bar atas untuk halaman publik (komunitas dan baca): bisa dibuka tanpa login; tombol kanan menyesuaikan status masuk. */
export async function PublicHeader({ aktif }: { aktif?: "komunitas" }) {
  const supabase = await createClient();
  // hanya menentukan tombol kanan (Dashboard atau Masuk): membaca cookie tanpa panggilan jaringan ke server Auth
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session ? true : null;
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-foreground">
            <BookOpen size={18} />
          </span>
          <span className="hidden sm:inline">KomikEdu</span>
        </Link>
        <nav aria-label="Utama" className="flex items-center gap-1 text-sm">
          <Link
            href="/komunitas"
            aria-current={aktif === "komunitas" ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${aktif === "komunitas" ? "bg-surface-muted font-medium" : "hover:bg-surface-muted"}`}
          >
            <Users size={15} aria-hidden /> Komunitas
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
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
  );
}
