import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { generateCharacterSheet, namaTokoh, type KarakterSheet } from "@/lib/ai/characters";
import { cropPanels } from "@/lib/ai/crop";
import { GeminiImageProvider } from "@/lib/ai/gemini-image";
import { GAYA } from "@/lib/comics/schema";
import { PAGE_H, PAGE_W } from "@/lib/editor/types";

export const GAMBAR_COST = 1;

type PanelRow = {
  id: string;
  urutan: number;
  posisi: { x: number; y: number; w: number; h: number } | null;
  adegan: string | null;
  script_json: { adegan?: string; karakter?: string[]; dialog?: { karakter: string }[] } | null;
};

export type GenerateResult =
  | { ok: true; panels: { id: string; imageUrl: string }[]; saldo: number }
  | { ok: false; error: string; status: number };

const provider = new GeminiImageProvider();

/**
 * Buat gambar satu halaman: potong kredit, minta satu gambar untuk semua panel, potong per panel,
 * unggah, lalu isi image_url. Kredit dikembalikan bila gagal (sesuai PRD).
 * `supabase` = klien pengguna (cek kepemilikan lewat RLS), `admin` = service role (kredit, storage, image_url).
 */
export async function generatePageImage(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
  comicId: string,
  pageId: string,
): Promise<GenerateResult> {
  const { data: comic } = await supabase
    .from("comics")
    .select("id, user_id, jenjang, gaya, cerita, karakter_json, ref_halaman_url")
    .eq("id", comicId)
    .maybeSingle();
  if (!comic || comic.user_id !== userId) return { ok: false, error: "Komik tidak ditemukan", status: 404 };

  const { data: page } = await supabase
    .from("pages")
    .select("id, comic_id, panels(id, urutan, posisi, adegan, script_json)")
    .eq("id", pageId)
    .eq("comic_id", comicId)
    .maybeSingle();
  if (!page) return { ok: false, error: "Halaman tidak ditemukan", status: 404 };

  const panels = [...((page.panels ?? []) as PanelRow[])].sort((a, b) => a.urutan - b.urutan);
  if (!panels.length) return { ok: false, error: "Halaman belum punya panel", status: 400 };
  if (panels.length > 6) return { ok: false, error: "Satu halaman maksimal 6 panel untuk dibuat gambarnya", status: 400 };
  const adegan = panels.map((p) => (p.adegan ?? p.script_json?.adegan ?? "").trim());
  const kosong = adegan.findIndex((a) => !a);
  if (kosong >= 0) return { ok: false, error: `Panel ${kosong + 1} belum punya adegan. Isi adegannya dulu.`, status: 400 };

  // klaim halaman agar tidak dibuat dua kali bersamaan
  const { data: klaim } = await admin
    .from("panels")
    .update({ status: "generating" })
    .eq("page_id", pageId)
    .neq("status", "generating")
    .select("id");
  if (!klaim?.length) return { ok: false, error: "Gambar halaman ini sedang dibuat", status: 409 };

  const { data: paid, error: payError } = await admin.rpc("spend_credits", {
    p_user: userId,
    p_amount: GAMBAR_COST,
    p_alasan: "gambar halaman",
    p_ref: pageId,
  });
  if (payError || !paid) {
    await admin.from("panels").update({ status: "pending" }).eq("page_id", pageId);
    return { ok: false, error: payError ? "Gagal memproses kredit" : `Kredit tidak cukup (butuh ${GAMBAR_COST})`, status: 402 };
  }

  try {
    const gaya = GAYA.find((g) => g.id === comic.gaya) ?? GAYA[0];

    // lembar karakter: dibuat sekali per komik dari seluruh naskah, lalu dipakai di setiap halaman
    let karakter = (comic.karakter_json as KarakterSheet | null) ?? null;
    if (!karakter) {
      const { data: semua } = await supabase.from("pages").select("panels(script_json)").eq("comic_id", comicId);
      const scripts = (semua ?? []).flatMap((pg) => ((pg.panels ?? []) as { script_json: PanelRow["script_json"] }[]).map((p) => p.script_json ?? {}));
      karakter = await generateCharacterSheet(namaTokoh(scripts), { jenjang: comic.jenjang, gaya: gaya.prompt, cerita: comic.cerita });
      await admin.from("comics").update({ karakter_json: karakter }).eq("id", comicId);
    }

    // halaman pertama yang berhasil menjadi referensi visual untuk halaman berikutnya
    const referenceImages: { data: Uint8Array; mimeType: string }[] = [];
    if (comic.ref_halaman_url) {
      const r = await fetch(comic.ref_halaman_url);
      if (r.ok) referenceImages.push({ data: new Uint8Array(await r.arrayBuffer()), mimeType: r.headers.get("content-type") ?? "image/webp" });
    }

    const rects = panels.map((p) => {
      const pos = p.posisi ?? { x: 0, y: 0, w: PAGE_W, h: PAGE_H };
      return { x: pos.x / PAGE_W, y: pos.y / PAGE_H, w: pos.w / PAGE_W, h: pos.h / PAGE_H };
    });
    const hasil = await provider.generatePage({
      gaya: gaya.prompt,
      karakter,
      referenceImages,
      panels: panels.map((p, i) => ({ adegan: adegan[i], karakter: p.script_json?.karakter ?? [], rect: rects[i] })),
    });

    const crops = await cropPanels(hasil.image, rects);
    const stamp = Date.now();
    const base = `${userId}/${comicId}`;
    const uploaded: { id: string; imageUrl: string }[] = [];
    for (let i = 0; i < panels.length; i++) {
      const path = `${base}/${panels[i].id}-${stamp}.webp`;
      const { error } = await admin.storage.from("panels").upload(path, crops[i].image, { contentType: "image/webp", upsert: true });
      if (error) throw error;
      uploaded.push({ id: panels[i].id, imageUrl: admin.storage.from("panels").getPublicUrl(path).data.publicUrl });
    }

    if (!comic.ref_halaman_url) {
      const full = await sharp(hasil.image).resize({ width: 768 }).webp({ quality: 80 }).toBuffer();
      const path = `${base}/halaman-${pageId}-${stamp}.webp`;
      const { error } = await admin.storage.from("panels").upload(path, full, { contentType: "image/webp", upsert: true });
      if (!error) {
        await admin.from("comics").update({ ref_halaman_url: admin.storage.from("panels").getPublicUrl(path).data.publicUrl }).eq("id", comicId);
      }
    }

    for (const u of uploaded) {
      const { error } = await admin.from("panels").update({ image_url: u.imageUrl, status: "selesai" }).eq("id", u.id);
      if (error) throw error;
    }
    await admin.from("generations").insert({ user_id: userId, jenis: "gambar", provider: hasil.provider, status: "selesai" });
    const { data: profil } = await admin.from("users").select("saldo_kredit").eq("id", userId).single();
    return { ok: true, panels: uploaded, saldo: profil?.saldo_kredit ?? 0 };
  } catch (e) {
    console.error("generatePageImage gagal", pageId, e);
    await admin.rpc("refund_credits", { p_user: userId, p_amount: GAMBAR_COST, p_alasan: "refund gambar gagal", p_ref: pageId });
    await admin.from("panels").update({ status: "gagal" }).eq("page_id", pageId);
    await admin.from("generations").insert({ user_id: userId, jenis: "gambar", provider: "gemini", status: "gagal" });
    const diblokir = e instanceof Error && /diblokir|tidak mengembalikan gambar/i.test(e.message);
    return {
      ok: false,
      error: diblokir
        ? "Gambar tidak bisa dibuat untuk adegan ini. Coba ubah deskripsi adegannya. Kredit sudah dikembalikan."
        : "Gagal membuat gambar. Kredit sudah dikembalikan, silakan coba lagi.",
      status: 500,
    };
  }
}
