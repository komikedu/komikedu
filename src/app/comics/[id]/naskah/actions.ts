"use server";

import { checkScript } from "@/lib/ai/check";
import { createScript } from "@/lib/ai/pipeline";
import { flagMemblokir, type Flag } from "@/lib/ai/schemas";
import { barisGenerations, rekamPemakaian, type Pemakaian } from "@/lib/ai/usage";
import { NASKAH_COST, NaskahEditSchema, uuid } from "@/lib/comics/naskah-edit";
import { draftErrors } from "@/lib/comics/schema";
import type { Tokoh } from "@/lib/comics/tokoh";
import { scriptToPages } from "@/lib/editor/from-script";
import { toRows } from "@/lib/editor/persist";
import { createAdminClient, createClient } from "@/lib/supabase/server";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const STALE_MS = 5 * 60 * 1000; // proses "generating" lebih lama dari ini dianggap macet dan boleh diulang

async function ownComic(comicId: string, columns: string) {
  if (!uuid.safeParse(comicId).success) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("comics").select(`user_id, ${columns}`).eq("id", comicId).maybeSingle();
  if (!data || (data as unknown as { user_id: string }).user_id !== user.id) return null;
  return { supabase, user, comic: data as unknown as Record<string, unknown> };
}

/**
 * Buat outline + naskah dengan AI. Kredit dipotong di awal dan dikembalikan bila gagal,
 * sehingga job gagal tidak memakan kredit (sesuai PRD).
 */
export async function generateNaskah(comicId: string): Promise<Result> {
  const own = await ownComic(comicId, "judul, topik, jenjang, mapel, tujuan, cerita, tokoh_json, jumlah_halaman, panel_per_halaman, gaya, naskah_status");
  if (!own) return { ok: false, error: "Komik tidak ditemukan" };
  const { supabase, user, comic } = own;

  const { data: materi } = await supabase.from("source_materials").select("teks_ekstraksi").eq("comic_id", comicId).maybeSingle();
  const errors = draftErrors({ topik: comic.topik as string | null, gaya: comic.gaya as never }, !!materi?.teks_ekstraksi);
  if (errors.length) return { ok: false, error: errors[0] };

  const admin = createAdminClient();
  const staleBefore = new Date(Date.now() - STALE_MS).toISOString();
  // klaim atomik: hanya satu proses yang bisa mengubah status ke "generating"
  const { data: claimed } = await admin
    .from("comics")
    .update({ naskah_status: "generating", naskah_started_at: new Date().toISOString(), naskah_error: null })
    .eq("id", comicId)
    .eq("user_id", user.id)
    .or(`naskah_status.in.(none,review,error),and(naskah_status.eq.generating,naskah_started_at.lt.${staleBefore})`)
    .select("id");
  if (!claimed?.length) {
    return { ok: false, error: comic.naskah_status === "approved" ? "Naskah sudah disetujui" : "Naskah sedang dibuat" };
  }
  const prevStatus = comic.naskah_status === "generating" ? "error" : (comic.naskah_status as string);

  const { data: paid, error: payError } = await admin.rpc("spend_credits", {
    p_user: user.id,
    p_amount: NASKAH_COST,
    p_alasan: "naskah",
    p_ref: comicId,
  });
  if (payError || !paid) {
    await admin.from("comics").update({ naskah_status: prevStatus, naskah_started_at: null }).eq("id", comicId);
    return { ok: false, error: payError ? "Gagal memproses kredit" : `Kredit tidak cukup (butuh ${NASKAH_COST})` };
  }

  const pemakaian: Pemakaian[] = [];
  try {
    const { outline, script, flags } = await rekamPemakaian(pemakaian, () => createScript({
      topik: (comic.topik as string | null)?.trim() || (comic.judul as string),
      materi: materi?.teks_ekstraksi ?? undefined,
      jenjang: comic.jenjang as number,
      mapel: comic.mapel as string,
      tujuan: (comic.tujuan as string | null) ?? undefined,
      cerita: (comic.cerita as string | null) ?? undefined,
      tokoh: ((comic.tokoh_json as Tokoh[] | null) ?? []).map((t) => ({ nama: t.nama, peran: t.peran, deskripsi: t.deskripsi })),
      jumlahHalaman: comic.jumlah_halaman as number,
      panelPerHalaman: (comic.panel_per_halaman as number | null) ?? null,
    }));
    const judul = comic.judul === "Komik tanpa judul" ? outline.judul.slice(0, 120) : (comic.judul as string);
    const { error } = await admin
      .from("comics")
      .update({ outline_json: outline, naskah_json: script, naskah_flags: flags, naskah_status: "review", naskah_error: null, judul })
      .eq("id", comicId);
    if (error) throw error;
    await admin.from("generations").insert(barisGenerations(pemakaian, { user_id: user.id, jenis: "naskah", provider: "gemini", status: "selesai" }));
    return { ok: true };
  } catch (e) {
    console.error("generateNaskah gagal", comicId, e);
    await admin.rpc("refund_credits", { p_user: user.id, p_amount: NASKAH_COST, p_alasan: "refund naskah gagal", p_ref: comicId });
    await admin
      .from("comics")
      .update({ naskah_status: "error", naskah_error: "Gagal membuat naskah. Kredit sudah dikembalikan, silakan coba lagi." })
      .eq("id", comicId);
    await admin.from("generations").insert(barisGenerations(pemakaian, { user_id: user.id, jenis: "naskah", provider: "gemini", status: "gagal" }));
    return { ok: false, error: "Gagal membuat naskah. Kredit sudah dikembalikan, silakan coba lagi." };
  }
}

/** Simpan suntingan guru dan hitung ulang tanda cek (hitungan diverifikasi ulang dengan mathjs). */
export async function saveNaskah(comicId: string, naskah: unknown): Promise<Result<{ flags: Flag[] }>> {
  const own = await ownComic(comicId, "naskah_status");
  if (!own) return { ok: false, error: "Komik tidak ditemukan" };
  if (own.comic.naskah_status !== "review") return { ok: false, error: "Naskah tidak sedang ditinjau" };

  const parsed = NaskahEditSchema.safeParse(naskah);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Naskah tidak valid" };

  const flags = checkScript(parsed.data);
  const { error } = await createAdminClient()
    .from("comics")
    .update({ naskah_json: parsed.data, naskah_flags: flags })
    .eq("id", comicId)
    .eq("user_id", own.user.id)
    .eq("naskah_status", "review");
  return error ? { ok: false, error: "Gagal menyimpan naskah" } : { ok: true, flags };
}

/** Setujui naskah: ubah menjadi halaman, panel, dan balon di editor (menggantikan isi editor). */
export async function approveNaskah(comicId: string): Promise<Result> {
  const own = await ownComic(comicId, "naskah_status, naskah_json");
  if (!own) return { ok: false, error: "Komik tidak ditemukan" };
  const { supabase, user, comic } = own;
  if (comic.naskah_status !== "review") return { ok: false, error: "Naskah tidak sedang ditinjau" };

  const parsed = NaskahEditSchema.safeParse(comic.naskah_json);
  if (!parsed.success) return { ok: false, error: "Naskah tersimpan tidak valid" };
  const flags = checkScript(parsed.data).filter(flagMemblokir);
  if (flags.length) return { ok: false, error: `Masih ada ${flags.length} tanda yang perlu diperbaiki` };

  const { pages, panelScripts } = scriptToPages(parsed.data);
  const rows = toRows(comicId, pages);

  // klien pengguna (RLS memastikan semua baris milik komik ini)
  const del = await supabase.from("pages").delete().eq("comic_id", comicId);
  if (del.error) return { ok: false, error: "Gagal mengosongkan editor" };
  const e1 = (await supabase.from("pages").insert(rows.pages)).error;
  const e2 = !e1 && (await supabase.from("panels").insert(rows.panels.map((p) => ({ ...p, script_json: panelScripts.get(p.id) })))).error;
  const e3 = !e1 && !e2 && rows.bubbles.length ? (await supabase.from("bubbles").insert(rows.bubbles)).error : null;
  if (e1 || e2 || e3) {
    await supabase.from("pages").delete().eq("comic_id", comicId);
    return { ok: false, error: "Gagal membuat halaman editor" };
  }

  const { error } = await createAdminClient()
    .from("comics")
    .update({ naskah_status: "approved" })
    .eq("id", comicId)
    .eq("user_id", user.id);
  return error ? { ok: false, error: "Gagal menyimpan status naskah" } : { ok: true };
}
