import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { z } from "zod";
import type { KarakterSheet } from "@/lib/ai/characters";
import { getImageProvider } from "@/lib/ai/image-providers";
import { ditolakFilter, kuotaHabis, PESAN_KUOTA } from "@/lib/ai/galat";
import { barisGenerations, rekamPemakaian, type Pemakaian } from "@/lib/ai/usage";
import { GAYA } from "@/lib/comics/schema";
import { potretTokoh, punyaPotret } from "@/lib/comics/referensi-tokoh";
import { ambilKunci, syaratKunciBebas } from "@/lib/comics/kunci-generate";
import { catatVersi } from "@/lib/comics/versi-gambar";
import { ambilGambar, kunciKomik, simpanGambar } from "@/lib/storage/gambar";
import type { Tokoh } from "@/lib/comics/tokoh";


export const EDIT_COST = 1;
export const InstruksiSchema = z.string().trim().min(3, "Tulis perubahan yang diinginkan").max(300, "Perintah maksimal 300 karakter");

export type EditResult = { ok: true; imageUrl: string; saldo: number } | { ok: false; error: string; status: number };


/**
 * Ubah gambar satu panel dengan perintah guru (mis. "tambahkan topi pada Doni"). Potong kredit,
 * kirim gambar panel saat ini + potret tokoh ke model, simpan hasil sebagai gambar panel baru.
 * Kredit dikembalikan bila gagal; gambar lama tetap dipakai.
 */
export async function editPanelImage(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
  comicId: string,
  panelId: string,
  instruksi: string,
  assetOrigin?: string,
): Promise<EditResult> {
  const { data: comic } = await supabase
    .from("comics")
    .select("id, user_id, gaya, tokoh_json, karakter_json")
    .eq("id", comicId)
    .maybeSingle();
  if (!comic || comic.user_id !== userId) return { ok: false, error: "Komik tidak ditemukan", status: 404 };

  const { data: panel } = await supabase
    .from("panels")
    .select("id, image_url, adegan, script_json, pages!inner(comic_id)")
    .eq("id", panelId)
    .eq("pages.comic_id", comicId)
    .maybeSingle();
  if (!panel) return { ok: false, error: "Panel tidak ditemukan", status: 404 };
  if (!panel.image_url) return { ok: false, error: "Panel ini belum punya gambar. Buat gambar halamannya dulu.", status: 400 };
  if (!kunciKomik(panel.image_url, userId, comicId)) return { ok: false, error: "Gambar panel tidak dikenali", status: 400 };

  const { data: klaim } = await admin.from("panels").update(ambilKunci()).eq("id", panelId).or(syaratKunciBebas()).select("id");
  if (!klaim?.length) return { ok: false, error: "Gambar panel ini sedang dibuat", status: 409 };

  const { data: paid, error: payError } = await admin.rpc("spend_credits", {
    p_user: userId,
    p_amount: EDIT_COST,
    p_alasan: "edit gambar panel",
    p_ref: panelId,
  });
  if (payError || !paid) {
    await admin.from("panels").update({ status: "selesai" }).eq("id", panelId);
    return { ok: false, error: payError ? "Gagal memproses kredit" : `Kredit tidak cukup (butuh ${EDIT_COST})`, status: 402 };
  }

  const provider = await getImageProvider();
  const pemakaian: Pemakaian[] = [];
  try {
    const asli = await ambilGambar(admin, panel.image_url!);
    if (!asli) throw new Error("Gambar panel tidak bisa diunduh");
    const bytesAsli = asli.data;
    const meta = await sharp(bytesAsli).metadata();

    const gaya = GAYA.find((g) => g.id === comic.gaya) ?? GAYA[0];
    const tokoh = ((comic.tokoh_json as Tokoh[] | null) ?? []).filter((t) => t.nama && t.deskripsi);
    const karakter = (comic.karakter_json as KarakterSheet | null) ?? tokoh.map((t) => ({ nama: t.nama, deskripsi: t.deskripsi }));
    const script = (panel.script_json ?? {}) as { karakter?: string[]; dialog?: { karakter: string }[] };
    const teks = [instruksi, panel.adegan ?? "", ...(script.karakter ?? []), ...(script.dialog ?? []).map((d) => d.karakter)].join(" ").toLowerCase();
    const tampil = tokoh.filter((t) => punyaPotret(t) && teks.includes(t.nama.toLowerCase())).slice(0, 2);
    const referenceImages = (await Promise.all(tampil.map((t) => potretTokoh(admin, userId, comicId, t, comic.gaya, assetOrigin)))).filter(
      (r): r is NonNullable<typeof r> => r !== null,
    );

    const hasil = await rekamPemakaian(pemakaian, () =>
      provider.editPanel({
        image: { data: bytesAsli, mimeType: asli.mimeType },
        instruksi,
        gaya: gaya.prompt,
        karakter: karakter.filter((k) => teks.includes(k.nama.toLowerCase())),
        referenceImages,
      }),
    );

    // samakan ukuran dengan gambar lama agar pas di bingkai panel
    const gambar = await sharp(hasil.image)
      .resize(meta.width && meta.height ? { width: meta.width, height: meta.height, fit: "cover" } : undefined)
      .webp({ quality: 85 })
      .toBuffer();
    const baru = `${userId}/${comicId}/${panelId}-edit-${Date.now()}.webp`;
    const imageUrl = await simpanGambar(admin, baru, gambar, "image/webp");
    const { error } = await admin.from("panels").update({ image_url: imageUrl, status: "selesai" }).eq("id", panelId);
    if (error) throw error;
    await catatVersi(admin, panelId, imageUrl, "edit");

    await admin.from("generations").insert(barisGenerations(pemakaian, { user_id: userId, jenis: "edit-panel", provider: hasil.provider, status: "selesai" }));
    const { data: profil } = await admin.from("users").select("saldo_kredit").eq("id", userId).single();
    return { ok: true, imageUrl, saldo: profil?.saldo_kredit ?? 0 };
  } catch (e) {
    console.error("editPanelImage gagal", panelId, e);
    await admin.rpc("refund_credits", { p_user: userId, p_amount: EDIT_COST, p_alasan: "refund edit panel gagal", p_ref: panelId });
    await admin.from("panels").update({ status: "selesai" }).eq("id", panelId);
    await admin.from("generations").insert(barisGenerations(pemakaian, { user_id: userId, jenis: "edit-panel", provider: provider.name, status: "gagal" }));
    return {
      ok: false,
      error: kuotaHabis(e)
        ? PESAN_KUOTA
        : ditolakFilter(e)
          ? "Perubahan ini ditolak filter keamanan layanan gambar. Coba tulis perintah lain. Kredit sudah dikembalikan."
          : "Gagal mengubah gambar. Kredit sudah dikembalikan, silakan coba lagi.",
      status: kuotaHabis(e) ? 503 : 500,
    };
  }
}
