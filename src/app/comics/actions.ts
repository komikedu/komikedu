"use server";

import { redirect } from "next/navigation";
import { extractText, getDocumentProxy } from "unpdf";
import { z } from "zod";
import { hapusFolderKomik } from "@/lib/storage/gambar";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { DraftPatchSchema, MAX_PDF_BYTES, MAX_PDF_PAGES, type DraftPatch } from "@/lib/comics/schema";

const MAX_TEXT_CHARS = 200_000;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createDraft() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("comics")
    .insert({ user_id: user.id })
    .select("id")
    .single();
  if (error || !data) throw new Error("Gagal membuat draft komik");
  redirect(`/comics/${data.id}/wizard`);
}

export async function saveDraft(id: string, patch: DraftPatch): Promise<{ ok: boolean }> {
  const { supabase } = await requireUser();
  const parsed = DraftPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false };
  // RLS memastikan hanya pemilik yang bisa mengubah; filter status mencegah mengubah komik yang sudah diproses
  const { error } = await supabase.from("comics").update(parsed.data).eq("id", id).eq("status", "draft");
  return { ok: !error };
}

export type MaterialResult =
  | { ok: true; halaman: number; karakter: number }
  | { ok: false; error: string };

/** Dipanggil setelah klien mengunggah PDF ke Storage: validasi, ekstrak teks, simpan. */
export async function processMaterial(comicId: string, path: string): Promise<MaterialResult> {
  const { supabase, user } = await requireUser();

  if (!path.startsWith(`${user.id}/${comicId}/`) || !path.endsWith(".pdf")) {
    return { ok: false, error: "Lokasi berkas tidak valid." };
  }

  const remove = () => supabase.storage.from("materials").remove([path]);

  const { data: blob, error: dlError } = await supabase.storage.from("materials").download(path);
  if (dlError || !blob) return { ok: false, error: "Berkas tidak ditemukan." };
  if (blob.size > MAX_PDF_BYTES) {
    await remove();
    return { ok: false, error: "Ukuran PDF melebihi 20 MB." };
  }

  let totalPages: number;
  let text: string;
  try {
    const pdf = await getDocumentProxy(new Uint8Array(await blob.arrayBuffer()));
    const res = await extractText(pdf, { mergePages: true });
    totalPages = res.totalPages;
    text = res.text.trim();
  } catch {
    await remove();
    return { ok: false, error: "PDF tidak bisa dibaca. Pastikan berkasnya tidak rusak atau terkunci." };
  }

  if (totalPages > MAX_PDF_PAGES) {
    await remove();
    return { ok: false, error: `PDF terlalu panjang (${totalPages} halaman, maksimal ${MAX_PDF_PAGES}).` };
  }
  if (text.length < 20) {
    await remove();
    return { ok: false, error: "PDF tidak berisi teks (mungkin hasil scan). Gunakan PDF berisi teks, atau isi topik secara manual." };
  }

  // satu materi per komik: hapus berkas lama bila ada
  const { data: lama } = await supabase.from("source_materials").select("file_url").eq("comic_id", comicId).maybeSingle();
  if (lama?.file_url && lama.file_url !== path) await supabase.storage.from("materials").remove([lama.file_url]);

  const { error } = await supabase
    .from("source_materials")
    .upsert({ comic_id: comicId, file_url: path, teks_ekstraksi: text.slice(0, MAX_TEXT_CHARS) }, { onConflict: "comic_id" });
  if (error) {
    await remove();
    return { ok: false, error: "Gagal menyimpan materi." };
  }
  return { ok: true, halaman: totalPages, karakter: Math.min(text.length, MAX_TEXT_CHARS) };
}

export async function removeMaterial(comicId: string): Promise<{ ok: boolean }> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("source_materials").select("file_url").eq("comic_id", comicId).maybeSingle();
  if (data?.file_url) await supabase.storage.from("materials").remove([data.file_url]);
  const { error } = await supabase.from("source_materials").delete().eq("comic_id", comicId);
  return { ok: !error };
}

const IdSchema = z.string().uuid();
const JudulSchema = z.string().trim().min(1, "Judul tidak boleh kosong").max(120, "Judul maksimal 120 karakter");

export async function renameComic(id: string, judul: string): Promise<{ ok: true; judul: string } | { ok: false; error: string }> {
  if (!IdSchema.safeParse(id).success) return { ok: false, error: "Komik tidak ditemukan" };
  const parsed = JudulSchema.safeParse(judul);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Judul tidak valid" };
  const { supabase, user } = await requireUser();
  // RLS membatasi ke komik milik sendiri; filter user_id menjaga bila kebijakan berubah
  const { data, error } = await supabase.from("comics").update({ judul: parsed.data }).eq("id", id).eq("user_id", user.id).select("id");
  if (error || !data?.length) return { ok: false, error: "Gagal mengubah judul" };
  return { ok: true, judul: parsed.data };
}

/**
 * Hapus komik beserta halaman, panel, balon, materi, dan gambarnya (cascade di database, berkas di storage).
 * Kredit yang sudah terpakai tidak dikembalikan. Komik yang naskahnya sedang dibuat tidak bisa dihapus.
 */
export async function deleteComic(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!IdSchema.safeParse(id).success) return { ok: false, error: "Komik tidak ditemukan" };
  const { supabase, user } = await requireUser();
  const { data: comic } = await supabase.from("comics").select("id, user_id, naskah_status").eq("id", id).maybeSingle();
  if (!comic || comic.user_id !== user.id) return { ok: false, error: "Komik tidak ditemukan" };
  if (comic.naskah_status === "generating") return { ok: false, error: "Naskah sedang dibuat. Coba lagi setelah selesai." };

  const admin = createAdminClient();
  const { error } = await admin.from("comics").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: "Gagal menghapus komik" };
  // berkas dihapus setelah baris database; bila gagal hanya menyisakan berkas yatim, bukan komik yang rusak
  const folder = `${user.id}/${id}`;
  const hapusMateri = async (a: ReturnType<typeof createAdminClient>, f: string) => {
    const { data } = await a.storage.from("materials").list(f, { limit: 1000 });
    const paths = (data ?? []).filter((x) => x.id).map((x) => `${f}/${x.name}`);
    if (paths.length) await a.storage.from("materials").remove(paths);
  };
  await Promise.allSettled([hapusFolderKomik(admin, user.id, id), hapusMateri(admin, folder)]);
  return { ok: true };
}
