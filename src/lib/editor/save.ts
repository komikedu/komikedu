import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { catatVersi } from "@/lib/comics/versi-gambar";
import { EditorPayloadSchema, panelSalinan, toRows } from "./persist";

export type SaveResult = { ok: true } | { ok: false; error: string; status: number };

const inList = (ids: string[]) => `(${ids.join(",")})`; // id sudah divalidasi sebagai UUID oleh zod

/**
 * Sinkronisasi penuh isi editor ke database (idempoten, aman diulang bila gagal di tengah).
 * Kepemilikan dijaga RLS; kolom image_url, status, dan script_json tidak pernah ditulis dari klien.
 */
export async function saveEditorData(
  supabase: SupabaseClient,
  userId: string,
  comicId: string,
  pages: unknown,
  /** service role: dipakai hanya untuk menyalin image_url panel salinan, kolom yang tidak boleh ditulis klien */
  admin?: SupabaseClient,
): Promise<SaveResult> {
  if (!z.string().uuid().safeParse(comicId).success) return { ok: false, error: "Komik tidak valid", status: 400 };
  const parsed = EditorPayloadSchema.safeParse(pages);
  if (!parsed.success) return { ok: false, error: "Data editor tidak valid", status: 400 };

  const { data: comic } = await supabase.from("comics").select("id").eq("id", comicId).eq("user_id", userId).maybeSingle();
  if (!comic) return { ok: false, error: "Komik tidak ditemukan", status: 404 };

  const rows = toRows(comicId, parsed.data);
  const pageIds = rows.pages.map((p) => p.id);
  const panelIds = rows.panels.map((p) => p.id);
  const bubbleIds = rows.bubbles.map((b) => b.id);
  const fail = (error: string): SaveResult => ({ ok: false, error, status: 500 });

  // 1. hapus yang sudah tidak ada di editor (anak dulu, lalu induk)
  const delBubbles = supabase.from("bubbles").delete().in("panel_id", panelIds);
  const e1 = (bubbleIds.length ? await delBubbles.not("id", "in", inList(bubbleIds)) : await delBubbles).error;
  const e2 = (await supabase.from("panels").delete().in("page_id", pageIds).not("id", "in", inList(panelIds))).error;
  const e3 = (await supabase.from("pages").delete().eq("comic_id", comicId).not("id", "in", inList(pageIds))).error;
  if (e1 || e2 || e3) return fail("Gagal membersihkan data lama");

  // 2. upsert dari induk ke anak
  if ((await supabase.from("pages").upsert(rows.pages, { onConflict: "id" })).error) return fail("Gagal menyimpan halaman");
  if ((await supabase.from("panels").upsert(rows.panels, { onConflict: "id" })).error) return fail("Gagal menyimpan panel");
  if (rows.bubbles.length && (await supabase.from("bubbles").upsert(rows.bubbles, { onConflict: "id" })).error) {
    return fail("Gagal menyimpan balon");
  }
  const salinan = panelSalinan(parsed.data);
  if (admin && salinan.length) await salinGambar(admin, comicId, salinan);
  return { ok: true };
}

/**
 * Panel salinan mengambil image_url dari panel asal (harus di komik yang sama) selama miliknya masih kosong.
 * Gagal menyalin tidak menggagalkan penyimpanan: gambar bisa dibuat ulang.
 */
async function salinGambar(admin: SupabaseClient, comicId: string, salinan: { id: string; dari: string }[]) {
  const { data: asal } = await admin
    .from("panels")
    .select("id, image_url, pages!inner(comic_id)")
    .in("id", [...new Set(salinan.map((s) => s.dari))])
    .eq("pages.comic_id", comicId);
  const url = new Map((asal ?? []).filter((p) => p.image_url).map((p) => [p.id as string, p.image_url as string]));
  const { data: tujuan } = await admin.from("panels").select("id").in("id", salinan.map((s) => s.id)).is("image_url", null);
  for (const t of tujuan ?? []) {
    const dari = salinan.find((s) => s.id === t.id)?.dari;
    const image_url = dari ? url.get(dari) : undefined;
    if (image_url) {
      await admin.from("panels").update({ image_url, status: "selesai" }).eq("id", t.id);
      await catatVersi(admin, t.id, image_url, "salinan");
    }
  }
}
