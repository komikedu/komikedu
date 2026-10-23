import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lengkapiDeskripsiTokoh } from "@/lib/ai/characters";
import { kuotaHabis, PESAN_KUOTA } from "@/lib/ai/galat";
import { barisGenerations, rekamPemakaian, type Pemakaian } from "@/lib/ai/usage";
import { GAYA } from "@/lib/comics/schema";
import type { Tokoh } from "@/lib/comics/tokoh";

export type LengkapiResult = { ok: true; deskripsi: string } | { ok: false; error: string; status: number };

/** Periksa isian dari klien: nama wajib (maks. 40 karakter), deskripsi boleh kosong (maks. 300). */
export function bacaIsianLengkapi(input: unknown): { ok: true; nama: string; deskripsi: string } | { ok: false; error: string } {
  const o = (input && typeof input === "object" ? input : {}) as { nama?: unknown; deskripsi?: unknown };
  const nama = typeof o.nama === "string" ? o.nama.replace(/\s+/g, " ").trim() : "";
  const deskripsi = typeof o.deskripsi === "string" ? o.deskripsi.trim() : "";
  if (!nama) return { ok: false, error: "Isi nama tokoh dulu" };
  if (nama.length > 40) return { ok: false, error: "Nama tokoh maksimal 40 karakter" };
  if (deskripsi.length > 300) return { ok: false, error: "Deskripsi maksimal 300 karakter" };
  return { ok: true, nama, deskripsi };
}

/**
 * Lengkapi deskripsi tokoh dengan AI memakai konteks komik (kelas, gaya gambar, cerita, dan tokoh lain agar serasi).
 * Gratis untuk guru (panggilan teks kecil), tetapi dicatat di tabel generations untuk pemantauan biaya.
 */
export async function lengkapiTokoh(supabase: SupabaseClient, admin: SupabaseClient, userId: string, comicId: string, input: unknown): Promise<LengkapiResult> {
  const isian = bacaIsianLengkapi(input);
  if (!isian.ok) return { ok: false, error: isian.error, status: 400 };
  const { data: comic } = await supabase.from("comics").select("id, user_id, jenjang, gaya, cerita, tokoh_json").eq("id", comicId).maybeSingle();
  if (!comic || comic.user_id !== userId) return { ok: false, error: "Komik tidak ditemukan", status: 404 };

  const gaya = GAYA.find((g) => g.id === comic.gaya) ?? GAYA[0];
  const lain = ((comic.tokoh_json as Tokoh[] | null) ?? []).filter((t) => t.nama.trim().toLowerCase() !== isian.nama.toLowerCase());
  const pemakaian: Pemakaian[] = [];
  try {
    const deskripsi = await rekamPemakaian(pemakaian, () =>
      lengkapiDeskripsiTokoh({ nama: isian.nama, deskripsi: isian.deskripsi, gaya: gaya.prompt, jenjang: comic.jenjang, cerita: comic.cerita, tokohLain: lain }),
    );
    if (!deskripsi) throw new Error("Deskripsi kosong");
    await admin.from("generations").insert(barisGenerations(pemakaian, { user_id: userId, jenis: "lengkapi-tokoh", provider: "gemini", status: "selesai" }));
    return { ok: true, deskripsi };
  } catch (e) {
    console.error("lengkapiTokoh gagal", comicId, e);
    await admin.from("generations").insert(barisGenerations(pemakaian, { user_id: userId, jenis: "lengkapi-tokoh", provider: "gemini", status: "gagal" }));
    return kuotaHabis(e) ? { ok: false, error: PESAN_KUOTA, status: 503 } : { ok: false, error: "Gagal melengkapi deskripsi. Coba lagi.", status: 500 };
  }
}
