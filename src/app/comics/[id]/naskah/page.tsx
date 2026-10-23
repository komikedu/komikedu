import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { LANGKAH_CERITA } from "@/lib/comics/schema";
import type { Flag, Script } from "@/lib/ai/schemas";
import { createClient } from "@/lib/supabase/server";
import { NaskahView, type NaskahStatus } from "./naskah-view";

// pembuatan naskah dengan AI butuh 30-60 detik
export const maxDuration = 120;

export default async function NaskahPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/comics/${id}/naskah`);

  const { data: comic } = await supabase
    .from("comics")
    .select("id, user_id, judul, topik, jenjang, jumlah_halaman, gaya, naskah_status, naskah_json, naskah_flags, naskah_started_at")
    .eq("id", id)
    .maybeSingle();
  if (!comic || comic.user_id !== user.id) notFound();
  // naskah belum ada atau gagal: pembuatannya ada di langkah terakhir wizard (tempat guru menulis cerita)
  if (comic.naskah_status === "none" || comic.naskah_status === "error") redirect(`/comics/${id}/wizard?langkah=${LANGKAH_CERITA}`);

  const [{ data: profil }, { count: halamanEditor }, { data: materi }] = await Promise.all([
    supabase.from("users").select("saldo_kredit").eq("id", user.id).single(),
    supabase.from("pages").select("id", { count: "exact", head: true }).eq("comic_id", id),
    supabase.from("source_materials").select("file_url").eq("comic_id", id).maybeSingle(),
  ]);

  return (
    <div className="min-h-screen bg-surface-muted">
      <AppHeader />
      <NaskahView
        comicId={comic.id}
        judul={comic.judul}
        ringkasan={{
          topik: comic.topik,
          jenjang: comic.jenjang,
          jumlahHalaman: comic.jumlah_halaman,
          gaya: comic.gaya,
          adaMateri: !!materi?.file_url,
        }}
        status={comic.naskah_status as NaskahStatus}
        naskah={comic.naskah_json as Script | null}
        flags={(comic.naskah_flags as Flag[] | null) ?? []}
        versi={comic.naskah_started_at ?? ""}
        saldo={profil?.saldo_kredit ?? 0}
        adaHalamanEditor={(halamanEditor ?? 0) > 0}
      />
    </div>
  );
}
