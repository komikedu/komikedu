import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { kuotaHabis, PESAN_KUOTA } from "@/lib/ai/galat";
import { analisisTokohCerita } from "@/lib/ai/tokoh-cerita";
import { barisGenerations, rekamPemakaian, type Pemakaian } from "@/lib/ai/usage";
import { MIN_CERITA_SUMBER } from "@/lib/comics/schema";
import type { Tokoh } from "@/lib/comics/tokoh";

export type AnalisisTokohResult = { ok: true; tokoh: Tokoh[] } | { ok: false; error: string; status: number };

/** Batas analisis per pengguna: cukup untuk mencoba beberapa cerita, tetapi menahan pemakaian berulang yang tidak perlu. */
export const MAKS_ANALISIS = 10;
export const JENDELA_ANALISIS_MENIT = 10;

/**
 * Cari tokoh dalam cerita sumber komik ini dengan AI. Gratis untuk guru (satu panggilan teks kecil) tetapi dicatat di
 * generations dan dibatasi per pengguna. Hanya mengembalikan usulan; tidak mengubah data komik.
 */
export async function analisisTokoh(supabase: SupabaseClient, admin: SupabaseClient, userId: string, comicId: string): Promise<AnalisisTokohResult> {
  const { data: comic } = await supabase.from("comics").select("id, user_id, jenjang, cerita, sumber").eq("id", comicId).maybeSingle();
  if (!comic || comic.user_id !== userId) return { ok: false, error: "Komik tidak ditemukan", status: 404 };
  const cerita = typeof comic.cerita === "string" ? comic.cerita.trim() : "";
  if (comic.sumber !== "cerita" || cerita.length < MIN_CERITA_SUMBER) return { ok: false, error: "Tempel ceritanya dulu untuk mencari tokoh", status: 400 };

  const sejak = new Date(Date.now() - JENDELA_ANALISIS_MENIT * 60_000).toISOString();
  const { count } = await admin.from("generations").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("jenis", "analisis-tokoh").gte("created_at", sejak);
  if ((count ?? 0) >= MAKS_ANALISIS) return { ok: false, error: "Terlalu sering mencari tokoh. Coba lagi beberapa menit lagi.", status: 429 };

  const pemakaian: Pemakaian[] = [];
  try {
    const tokoh = await rekamPemakaian(pemakaian, () => analisisTokohCerita(cerita, { jenjang: comic.jenjang as number }));
    await admin.from("generations").insert(barisGenerations(pemakaian, { user_id: userId, jenis: "analisis-tokoh", provider: "gemini", status: "selesai" }));
    return { ok: true, tokoh };
  } catch (e) {
    console.error("analisisTokoh gagal", comicId, e);
    await admin.from("generations").insert(barisGenerations(pemakaian, { user_id: userId, jenis: "analisis-tokoh", provider: "gemini", status: "gagal" }));
    return kuotaHabis(e) ? { ok: false, error: PESAN_KUOTA, status: 503 } : { ok: false, error: "Gagal mencari tokoh dari ceritamu. Coba lagi.", status: 500 };
  }
}
