import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateCharacterSheet, type KarakterSheet } from "@/lib/ai/characters";
import { tokohBelumAda } from "@/lib/ai/tokoh";
import { barisGenerations, rekamPemakaian, type Pemakaian } from "@/lib/ai/usage";
import { GAYA } from "@/lib/comics/schema";
import { MAX_TOKOH, tambahTokohDariSheet, type Tokoh } from "@/lib/comics/tokoh";

export type TokohNaskahResult<T = object> = ({ ok: true } & T) | { ok: false; error: string; status: number };

type SkripPanel = { karakter?: string[]; dialog?: { karakter: string }[] };

/**
 * Tokoh yang disebut di naskah halaman ini tetapi belum ada di daftar tokoh komik. Dibaca lewat klien pengguna, jadi RLS
 * membatasi ke pemilik. Panel tambahan yang ditulis manual (tanpa naskah) tidak ikut terdeteksi.
 */
export async function tokohNaskahBelumAda(supabase: SupabaseClient, comicId: string, pageId: string): Promise<TokohNaskahResult<{ nama: string[] }>> {
  const { data: comic } = await supabase.from("comics").select("id, tokoh_json").eq("id", comicId).maybeSingle();
  if (!comic) return { ok: false, error: "Komik tidak ditemukan", status: 404 };
  const { data: page } = await supabase.from("pages").select("panels(script_json)").eq("id", pageId).eq("comic_id", comicId).maybeSingle();
  if (!page) return { ok: false, error: "Halaman tidak ditemukan", status: 404 };
  const skrip = ((page.panels ?? []) as { script_json: SkripPanel | null }[]).map((p) => p.script_json ?? {});
  const tokoh = (comic.tokoh_json as Tokoh[] | null) ?? [];
  return { ok: true, nama: tokohBelumAda(skrip, tokoh, MAX_TOKOH) };
}

/** Bersihkan daftar nama dari klien: rapikan spasi, buang yang kosong atau terlalu panjang, dan yang kembar. */
export function bersihkanNama(nama: unknown): string[] {
  if (!Array.isArray(nama)) return [];
  const unik = new Map<string, string>();
  for (const n of nama) {
    if (typeof n !== "string") continue;
    const rapi = n.replace(/\s+/g, " ").trim();
    if (rapi && rapi.length <= 40 && !unik.has(rapi.toLowerCase())) unik.set(rapi.toLowerCase(), rapi);
  }
  return [...unik.values()];
}

/**
 * Tambahkan tokoh dari naskah ke daftar tokoh komik: deskripsi tampilan dibuat AI sekali (sama seperti lembar karakter),
 * nama yang sama dengan tokoh siap pakai memakai tokoh itu. Lembar karakter ikut diselaraskan agar gambar berikutnya
 * memakai deskripsi yang sama. `baru` berisi tokoh yang baru masuk, supaya potretnya bisa dibuat.
 */
export async function siapkanTokohNaskah(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
  comicId: string,
  namaMentah: unknown,
): Promise<TokohNaskahResult<{ tokoh: Tokoh[]; karakter: KarakterSheet; baru: Tokoh[] }>> {
  const { data: comic } = await supabase.from("comics").select("id, user_id, jenjang, gaya, cerita, tokoh_json, karakter_json").eq("id", comicId).maybeSingle();
  if (!comic || comic.user_id !== userId) return { ok: false, error: "Komik tidak ditemukan", status: 404 };

  const tokoh = ((comic.tokoh_json as Tokoh[] | null) ?? []).filter((t) => t.nama && t.deskripsi);
  const ada = new Set(tokoh.map((t) => t.nama.trim().toLowerCase()));
  const nama = bersihkanNama(namaMentah).filter((n) => !ada.has(n.toLowerCase()));
  if (!nama.length) return { ok: false, error: "Tidak ada tokoh baru untuk ditambahkan", status: 400 };
  if (tokoh.length + nama.length > MAX_TOKOH) {
    return { ok: false, error: `Daftar tokoh maksimal ${MAX_TOKOH}. Hapus ${tokoh.length + nama.length - MAX_TOKOH} tokoh dulu atau pilih lebih sedikit.`, status: 400 };
  }

  const pemakaian: Pemakaian[] = [];
  try {
    const gaya = GAYA.find((g) => g.id === comic.gaya) ?? GAYA[0];
    const deskripsi = await rekamPemakaian(pemakaian, () => generateCharacterSheet(nama, { jenjang: comic.jenjang, gaya: gaya.prompt, cerita: comic.cerita }));
    const lembar = [...tokoh.map((t) => ({ nama: t.nama, deskripsi: t.deskripsi })), ...deskripsi];
    const hasil = tambahTokohDariSheet(tokoh, lembar);
    const { error } = await admin.from("comics").update({ tokoh_json: hasil.tokoh, karakter_json: hasil.sheet }).eq("id", comicId).eq("user_id", userId);
    if (error) throw error;
    await admin.from("generations").insert(barisGenerations(pemakaian, { user_id: userId, jenis: "deskripsi-tokoh", provider: "gemini", status: "selesai" }));
    return { ok: true, tokoh: hasil.tokoh, karakter: hasil.sheet, baru: hasil.tokoh.slice(tokoh.length) };
  } catch (e) {
    console.error("siapkanTokohNaskah gagal", comicId, e);
    await admin.from("generations").insert(barisGenerations(pemakaian, { user_id: userId, jenis: "deskripsi-tokoh", provider: "gemini", status: "gagal" }));
    return { ok: false, error: "Gagal membuat tokoh. Coba lagi.", status: 500 };
  }
}
