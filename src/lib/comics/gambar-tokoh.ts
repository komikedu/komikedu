import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { kuotaHabis, PESAN_KUOTA } from "@/lib/ai/galat";
import { getImageProvider } from "@/lib/ai/image-providers";
import { barisGenerations, rekamPemakaian, type Pemakaian } from "@/lib/ai/usage";
import { potretTokoh, type GambarReferensi } from "@/lib/comics/referensi-tokoh";
import { GAYA } from "@/lib/comics/schema";
import { isPresetId, type Tokoh } from "@/lib/comics/tokoh";
import { ambilGambar, hapusGambar, kunciKomik, simpanGambar } from "@/lib/storage/gambar";
import { catatGaleriTokoh, type SumberGaleri } from "@/lib/comics/galeri-tokoh";

export const GAMBAR_TOKOH_COST = 1;
export const MAX_UNGGAH_BYTES = 5 * 1024 * 1024;

/** "potret" = setengah badan (kotak, untuk avatar dan acuan wajah); "badan" = seluruh tubuh berdiri. */
export type JenisGambar = "potret" | "badan";

export type GambarTokohResult = { ok: true; tokoh: Tokoh[]; saldo?: number } | { ok: false; error: string; status: number };


/** Ubah ukuran: potret dipotong kotak, badan penuh dimuat dalam 768 x 1024 tanpa dipotong. */
async function ubahUkuran(bytes: Uint8Array, jenis: JenisGambar): Promise<Buffer> {
  const img = sharp(bytes);
  return (
    jenis === "potret"
      ? img.resize({ width: 512, height: 512, fit: "cover", position: "top" })
      : img.resize({ width: 768, height: 1024, fit: "inside", withoutEnlargement: true })
  )
    .webp({ quality: 85 })
    .toBuffer();
}

/**
 * Simpan gambar tokoh (hasil AI atau unggahan) ke penyimpanan, jadikan gambar aktif tokoh itu, dan catat di galeri.
 * Gambar lama TIDAK dihapus: tetap ada di galeri dan bisa dipasang lagi. tokoh_json dibaca ulang agar perubahan
 * lain selama gambar dibuat tidak tertimpa.
 */
export async function simpanGambarTokoh(
  admin: SupabaseClient,
  userId: string,
  comicId: string,
  tokohId: string,
  jenis: JenisGambar,
  bytes: Uint8Array,
  sumber: SumberGaleri,
): Promise<Tokoh[]> {
  const gambar = await ubahUkuran(bytes, jenis);
  const url = await simpanGambar(admin, `${userId}/${comicId}/tokoh-${tokohId}-${jenis}-${Date.now()}.webp`, gambar, "image/webp");

  const { data: terbaru } = await admin.from("comics").select("tokoh_json").eq("id", comicId).single();
  const daftar = (terbaru?.tokoh_json as Tokoh[] | null) ?? [];
  if (!daftar.some((t) => t.id === tokohId)) {
    await hapusGambar(admin, url);
    throw new Error("Tokoh dihapus saat gambar dibuat");
  }
  const baru = daftar.map((t) => (t.id === tokohId ? { ...t, [jenis]: url } : t));
  const { error } = await admin.from("comics").update({ tokoh_json: baru }).eq("id", comicId);
  if (error) {
    await hapusGambar(admin, url);
    throw error;
  }
  await catatGaleriTokoh(admin, comicId, tokohId, jenis, url, sumber);
  return baru;
}

/** Gambar hasil unggahan guru: diperiksa isinya (bukan hanya tipe berkas) lalu disimpan tanpa memakai kredit. */
export async function unggahGambarTokoh(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
  comicId: string,
  tokohId: string,
  jenis: JenisGambar,
  bytes: Uint8Array,
): Promise<GambarTokohResult> {
  const { data: comic } = await supabase.from("comics").select("id, user_id, tokoh_json").eq("id", comicId).maybeSingle();
  if (!comic || comic.user_id !== userId) return { ok: false, error: "Komik tidak ditemukan", status: 404 };
  const tokoh = ((comic.tokoh_json as Tokoh[] | null) ?? []).find((t) => t.id === tokohId);
  if (!tokoh) return { ok: false, error: "Tokoh tidak ditemukan", status: 404 };
  if (jenis === "potret" && tokoh.preset && isPresetId(tokoh.id)) return { ok: false, error: "Potret tokoh siap pakai tidak bisa diganti", status: 400 };
  if (bytes.length === 0 || bytes.length > MAX_UNGGAH_BYTES) return { ok: false, error: "Ukuran gambar maksimal 5 MB", status: 400 };
  const meta = await sharp(bytes).metadata().catch(() => null);
  if (!meta?.format || !["jpeg", "png", "webp"].includes(meta.format)) return { ok: false, error: "Gambar harus berformat JPG, PNG, atau WebP", status: 400 };
  try {
    return { ok: true, tokoh: await simpanGambarTokoh(admin, userId, comicId, tokohId, jenis, bytes, "unggah") };
  } catch (e) {
    console.error("unggahGambarTokoh gagal", tokohId, e);
    return { ok: false, error: "Gagal menyimpan gambar. Coba lagi.", status: 500 };
  }
}

/**
 * Buat potret atau badan penuh tokoh dengan AI. Potret dikirim sebagai acuan wajah saat membuat badan penuh;
 * halaman pertama komik (bila ada) ikut agar mengikuti tokoh yang sudah digambar. Kredit dikembalikan bila gagal.
 */
export async function buatGambarTokoh(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
  comicId: string,
  tokohId: string,
  jenis: JenisGambar,
  assetOrigin?: string,
): Promise<GambarTokohResult> {
  const { data: comic } = await supabase.from("comics").select("id, user_id, gaya, tokoh_json, ref_halaman_url").eq("id", comicId).maybeSingle();
  if (!comic || comic.user_id !== userId) return { ok: false, error: "Komik tidak ditemukan", status: 404 };
  const tokoh = ((comic.tokoh_json as Tokoh[] | null) ?? []).find((t) => t.id === tokohId);
  if (!tokoh) return { ok: false, error: "Tokoh tidak ditemukan", status: 404 };
  if (jenis === "potret" && tokoh.preset) return { ok: false, error: "Tokoh siap pakai sudah punya potret", status: 400 };

  const { data: paid, error: payError } = await admin.rpc("spend_credits", {
    p_user: userId,
    p_amount: GAMBAR_TOKOH_COST,
    p_alasan: `${jenis} tokoh`,
    p_ref: comicId,
  });
  if (payError || !paid) return { ok: false, error: payError ? "Gagal memproses kredit" : `Kredit tidak cukup (butuh ${GAMBAR_TOKOH_COST})`, status: 402 };

  const provider = await getImageProvider();
  const pemakaian: Pemakaian[] = [];
  try {
    const gaya = GAYA.find((g) => g.id === comic.gaya) ?? GAYA[0];
    const referenceImages: GambarReferensi[] = [];
    // badan penuh mengacu ke potret tokoh itu sendiri (tanpa badan lama, yang mungkin sudah tidak cocok)
    if (jenis === "badan") {
      const potret = await potretTokoh(admin, userId, comicId, { ...tokoh, badan: undefined }, comic.gaya, assetOrigin);
      if (potret) referenceImages.push({ ...potret, label: `potret ${tokoh.nama}` });
    }
    if (referenceImages.length < 2 && kunciKomik(comic.ref_halaman_url, userId, comicId)) {
      const hal = await ambilGambar(admin, comic.ref_halaman_url!);
      if (hal) referenceImages.push({ ...hal, label: "halaman komik yang sudah dibuat" });
    }

    const hasil = await rekamPemakaian(pemakaian, () =>
      provider.generatePortrait({ nama: tokoh.nama, deskripsi: tokoh.deskripsi, gaya: gaya.prompt, bentuk: jenis, referenceImages }),
    );
    const daftar = await simpanGambarTokoh(admin, userId, comicId, tokohId, jenis, hasil.image, "ai");

    await admin.from("generations").insert(barisGenerations(pemakaian, { user_id: userId, jenis: `${jenis}-tokoh`, provider: hasil.provider, status: "selesai" }));
    const { data: profil } = await admin.from("users").select("saldo_kredit").eq("id", userId).single();
    return { ok: true, tokoh: daftar, saldo: profil?.saldo_kredit ?? 0 };
  } catch (e) {
    console.error("buatGambarTokoh gagal", tokohId, jenis, e);
    await admin.rpc("refund_credits", { p_user: userId, p_amount: GAMBAR_TOKOH_COST, p_alasan: `refund ${jenis} tokoh gagal`, p_ref: comicId });
    await admin.from("generations").insert(barisGenerations(pemakaian, { user_id: userId, jenis: `${jenis}-tokoh`, provider: provider.name, status: "gagal" }));
    return kuotaHabis(e)
      ? { ok: false, error: PESAN_KUOTA, status: 503 }
      : { ok: false, error: `Gagal membuat ${jenis === "potret" ? "potret" : "badan penuh"}. Kredit sudah dikembalikan, silakan coba lagi.`, status: 500 };
  }
}
