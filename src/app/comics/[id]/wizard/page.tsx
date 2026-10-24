import { kumpulkanTokohLama } from "@/lib/comics/tokoh-lama";
import { notFound, redirect } from "next/navigation";
import { BAHASA_IDS, TEMA_IDS } from "@/lib/comics/klasifikasi";
import { WIZARD_STEPS } from "@/lib/comics/schema";
import type { Tokoh } from "@/lib/comics/tokoh";
import { ukuranDariBaris } from "@/lib/editor/ukuran-halaman";
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
    .select("id, user_id, judul, topik, jenjang, tujuan, cerita, tokoh_json, jumlah_halaman, halaman_otomatis, panel_per_halaman, panel_per_halaman_maks, dengan_sampul, sumber, tema, bahasa, gaya, lebar_halaman, tinggi_halaman, wizard_step, status, naskah_status, naskah_error")
    .eq("id", id)
    .maybeSingle();
  if (!comic || comic.user_id !== user.id) notFound();
  if (comic.status !== "draft") redirect("/dashboard");

  const [{ data: materi }, { data: profil }, { data: komikLain }] = await Promise.all([
    supabase.from("source_materials").select("file_url, teks_ekstraksi").eq("comic_id", id).maybeSingle(),
    supabase.from("users").select("saldo_kredit").eq("id", user.id).single(),
    supabase.from("comics").select("id, judul, tokoh_json").eq("user_id", user.id).neq("id", id).order("updated_at", { ascending: false }).limit(20),
  ]);

  // ?langkah=6 membuka langsung langkah cerita (mis. dari dashboard atau setelah naskah gagal)
  const ukuran = ukuranDariBaris(comic);
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
          halaman_otomatis: comic.halaman_otomatis === true,
          panel_per_halaman: comic.panel_per_halaman ?? null,
          panel_per_halaman_maks: comic.panel_per_halaman_maks ?? null,
          dengan_sampul: comic.dengan_sampul === true,
          tema: TEMA_IDS.includes(comic.tema) ? comic.tema : null,
          bahasa: BAHASA_IDS.includes(comic.bahasa) ? comic.bahasa : "indonesia",
          sumber: comic.sumber === "cerita" || comic.sumber === "pdf" ? comic.sumber : "topik",
          gaya: comic.gaya,
          lebar_halaman: ukuran.w,
          tinggi_halaman: ukuran.h,
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
        tokohLama={kumpulkanTokohLama(komikLain ?? [], id)}
      />
    </div>
  );
}
