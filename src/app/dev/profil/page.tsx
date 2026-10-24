import { notFound } from "next/navigation";
import { AppHeaderView } from "@/components/app-header";
import { ProfilForm } from "@/app/profil/profil-form";

/** Pratinjau halaman edit profil dengan data contoh, tanpa login. Menyimpan akan gagal karena tidak ada sesi. Hanya development. */
export default function DevProfilPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="min-h-screen bg-surface-muted">
      <AppHeaderView user={{ email: "hi.komikedu@gmail.com", nama: "Bu Rina", saldo: 87 }} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-semibold">Edit profil</h1>
        <p className="mt-1 text-sm text-gray-600">Nama Anda tampil di komik yang diterbitkan ke komunitas sebagai nama penulis.</p>
        <ProfilForm email="hi.komikedu@gmail.com" masuk="Google" saldo={87} awal={{ nama: "Bu Rina", peran: "guru", sekolah: "SDN 1 Merdeka" }} />
      </main>
    </div>
  );
}
