import { redirect } from "next/navigation";
import { AppHeaderView } from "@/components/app-header";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { ProfilForm } from "./profil-form";

export const metadata = { title: "Edit profil" };

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profil");

  const { data: profil } = await supabase.from("users").select("nama, peran, sekolah, saldo_kredit").eq("id", user.id).single();
  const masuk = user.app_metadata?.provider === "google" ? "Google" : "tautan email";

  return (
    <div className="min-h-screen bg-surface-muted">
      <AppHeaderView user={{ email: user.email ?? "", nama: profil?.nama ?? "", saldo: profil?.saldo_kredit ?? 0, admin: isAdminEmail(user.email) }} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-semibold">Edit profil</h1>
        <p className="mt-1 text-sm text-gray-600">Nama Anda tampil di komik yang diterbitkan ke komunitas sebagai nama penulis.</p>
        <ProfilForm email={user.email ?? ""} masuk={masuk} saldo={profil?.saldo_kredit ?? 0} awal={{ nama: profil?.nama ?? "", peran: profil?.peran ?? "", sekolah: profil?.sekolah ?? "" }} />
      </main>
    </div>
  );
}
