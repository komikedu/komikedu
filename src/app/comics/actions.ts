"use server";

import { redirect } from "next/navigation";
import { extractText, getDocumentProxy } from "unpdf";
import { createClient } from "@/lib/supabase/server";
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
