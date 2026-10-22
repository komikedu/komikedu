import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const { data: profil } = await supabase
    .from("users")
    .select("nama, saldo_kredit")
    .eq("id", user.id)
    .single();

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
    </main>
  );
}
