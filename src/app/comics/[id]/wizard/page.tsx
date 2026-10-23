import { notFound, redirect } from "next/navigation";
import { WIZARD_STEPS } from "@/lib/comics/schema";
import type { Tokoh } from "@/lib/comics/tokoh";
import { createClient } from "@/lib/supabase/server";
import { WizardForm } from "./wizard-form";

// tombol "Buat naskah" di langkah terakhir memanggil AI (30-60 detik)
export const maxDuration = 120;

export default async function WizardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ langkah?: string }>;
}) {
  const { id } = await params;
  const { langkah } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/comics/${id}/wizard`);

  const { data: comic } = await supabase
    .from("comics")
    .select("id, user_id, judul, topik, jenjang, tujuan, cerita, tokoh_json, jumlah_halaman, panel_per_halaman, gaya, wizard_step, status, naskah_status, naskah_error")
    .eq("id", id)
    .maybeSingle();
  if (!comic || comic.user_id !== user.id) notFound();
  if (comic.status !== "draft") redirect("/dashboard");

  const [{ data: materi }, { data: profil }] = await Promise.all([
    supabase.from("source_materials").select("file_url, teks_ekstraksi").eq("comic_id", id).maybeSingle(),
    supabase.from("users").select("saldo_kredit").eq("id", user.id).single(),
  ]);

  // ?langkah=5 membuka langsung langkah cerita (mis. dari dashboard atau setelah naskah gagal)
  const diminta = Number(langkah);
  const step = Number.isInteger(diminta) && diminta >= 1 && diminta <= WIZARD_STEPS ? diminta : comic.wizard_step;

  return (
    <div className="min-h-screen">
      <WizardForm
        comicId={comic.id}
        userId={user.id}
        initial={{
          judul: comic.judul,
          topik: comic.topik,
          jenjang: comic.jenjang,
          tujuan: comic.tujuan,
          cerita: comic.cerita,
          tokoh_json: (comic.tokoh_json as Tokoh[] | null) ?? [],
          jumlah_halaman: comic.jumlah_halaman,
          panel_per_halaman: comic.panel_per_halaman ?? null,
          gaya: comic.gaya,
          wizard_step: step,
        }}
        materiAwal={
          materi?.file_url
            ? { nama: materi.file_url.split("/").pop() ?? "materi.pdf", karakter: materi.teks_ekstraksi?.length ?? 0 }
            : null
        }
        naskahStatus={comic.naskah_status}
        naskahError={comic.naskah_error}
        saldo={profil?.saldo_kredit ?? 0}
      />
    </div>
  );
}
