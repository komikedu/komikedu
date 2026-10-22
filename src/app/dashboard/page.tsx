import Link from "next/link";
import { redirect } from "next/navigation";
import { createDraft } from "@/app/comics/actions";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const [{ data: profil }, { data: komik }] = await Promise.all([
    supabase.from("users").select("nama, saldo_kredit").eq("id", user.id).single(),
    supabase
      .from("comics")
      .select("id, judul, jenjang, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <form action="/auth/signout" method="post">
          <button className="text-sm underline">Keluar</button>
        </form>
      </div>
      <p className="mt-4">Halo, {profil?.nama ?? user.email}.</p>
      <p className="mt-1 text-sm text-gray-600">Saldo kredit: {profil?.saldo_kredit ?? 0}</p>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Komik saya</h2>
        <form action={createDraft}>
          <button className="rounded bg-black px-4 py-2 text-sm font-medium text-white">Buat komik baru</button>
        </form>
      </div>

      {komik && komik.length > 0 ? (
        <ul className="mt-4 divide-y rounded border border-gray-200">
          {komik.map((k) => (
            <li key={k.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{k.judul}</p>
                <p className="text-xs text-gray-500">
                  SD kelas {k.jenjang} · {k.status}
                </p>
              </div>
              <div className="flex gap-4 text-sm">
                {k.status === "draft" && (
                  <Link href={`/comics/${k.id}/wizard`} className="underline">
                    Pengaturan
                  </Link>
                )}
                <Link href={`/comics/${k.id}/editor`} className="font-medium underline">
                  Buka editor
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-gray-600">Belum ada komik. Mulai dengan tombol di atas.</p>
      )}
    </main>
  );
}
