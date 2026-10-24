import { Comic_Neue } from "next/font/google";
import { notFound, redirect } from "next/navigation";
import type { BahasaId, TemaId } from "@/lib/comics/klasifikasi";
import type { Tokoh } from "@/lib/comics/tokoh";
import { createPage } from "@/lib/editor/factory";
import { fromNested, type NestedPage } from "@/lib/editor/persist";
import { ukuranDariBaris } from "@/lib/editor/ukuran-halaman";
import { createClient, penggunaTerlindungi } from "@/lib/supabase/server";
import { EditorShell } from "./editor-shell";

const comicFont = Comic_Neue({ weight: ["400", "700"], subsets: ["latin"], display: "swap" });

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await penggunaTerlindungi(supabase);
  if (!user) redirect(`/login?next=/comics/${id}/editor`);

  // semua query berjalan bersamaan: tiap permintaan ke Supabase memakan ratusan milidetik, jadi berurutan terasa lambat
  const [{ data: comic }, { data: profil }, { data: rows }] = await Promise.all([
    supabase.from("comics").select("id, user_id, judul, gaya, tokoh_json, karakter_json, is_public, status, deskripsi_publik, tema, bahasa, lebar_halaman, tinggi_halaman").eq("id", id).maybeSingle(),
    supabase.from("users").select("saldo_kredit, nama").eq("id", user.id).single(),
    supabase
      .from("pages")
      .select(
        "id, urutan, template_layout, elemen_bebas, panels(id, urutan, script_json, image_url, posisi, tampil, adegan, math_elements_json, bubbles(id, jenis, teks, posisi, ukuran, ekor, font_size, tampil, urutan))",
      )
      .eq("comic_id", id)
      .order("urutan"),
  ]);
  if (!comic || comic.user_id !== user.id) notFound();

  // komik baru belum punya halaman: mulai dari satu halaman kosong (belum disimpan sampai ada perubahan)
  const ukuran = ukuranDariBaris(comic);
  const pages = rows && rows.length > 0 ? fromNested(rows as unknown as NestedPage[], ukuran) : [createPage("3-satu-atas-dua-bawah", [], ukuran)];

  return (
    <div className={comicFont.className}>
      <EditorShell
        comicId={comic.id}
        title={comic.judul}
        fontFamily={comicFont.style.fontFamily}
        initialPages={pages}
        kredit={profil?.saldo_kredit ?? 0}
        tokoh={(comic.tokoh_json as Tokoh[] | null) ?? []}
        gaya={comic.gaya}
        karakter={(comic.karakter_json as { nama: string; deskripsi: string }[] | null) ?? []}
        penulis={profil?.nama || "Guru KomikEdu"}
        terbit={{ terbit: comic.is_public && comic.status === "terbit", deskripsi: comic.deskripsi_publik ?? "", tema: (comic.tema as TemaId | null) ?? null, bahasa: (comic.bahasa as BahasaId | null) ?? "indonesia" }}
      />
    </div>
  );
}
