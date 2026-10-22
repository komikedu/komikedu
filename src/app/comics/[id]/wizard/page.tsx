import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WizardForm } from "./wizard-form";

export default async function WizardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/comics/${id}/wizard`);

  const { data: comic } = await supabase
    .from("comics")
    .select("id, user_id, judul, topik, jenjang, tujuan, jumlah_halaman, gaya, wizard_step, status")
    .eq("id", id)
    .maybeSingle();
  if (!comic || comic.user_id !== user.id) notFound();
  if (comic.status !== "draft") redirect("/dashboard");

  const { data: materi } = await supabase
    .from("source_materials")
    .select("file_url, teks_ekstraksi")
    .eq("comic_id", id)
    .maybeSingle();

  return (
    <WizardForm
      comicId={comic.id}
      userId={user.id}
      initial={{
        judul: comic.judul,
        topik: comic.topik,
        jenjang: comic.jenjang,
        tujuan: comic.tujuan,
        jumlah_halaman: comic.jumlah_halaman,
        gaya: comic.gaya,
        wizard_step: comic.wizard_step,
      }}
      materiAwal={
        materi?.file_url
          ? { nama: materi.file_url.split("/").pop() ?? "materi.pdf", karakter: materi.teks_ekstraksi?.length ?? 0 }
          : null
      }
    />
  );
}
