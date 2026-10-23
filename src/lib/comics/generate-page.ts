import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { generateCharacterSheet, namaTokoh, type KarakterSheet } from "@/lib/ai/characters";
import { cropPanels } from "@/lib/ai/crop";
import { getImageProvider } from "@/lib/ai/image-providers";
import { kuotaHabis, PESAN_KUOTA } from "@/lib/ai/galat";
import { barisGenerations, rekamPemakaian, type Pemakaian } from "@/lib/ai/usage";
import { GAYA } from "@/lib/comics/schema";
import { catatVersi } from "@/lib/comics/versi-gambar";
import { simpanGambar } from "@/lib/storage/gambar";
import { potretTokoh, punyaPotret } from "@/lib/comics/referensi-tokoh";
import { sheetCocok, tambahTokohDariSheet, type Tokoh } from "@/lib/comics/tokoh";
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
  | { ok: true; panels: { id: string; imageUrl: string }[]; saldo: number; tokoh: Tokoh[]; karakter: KarakterSheet }
  | { ok: false; error: string; status: number };


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
  /** origin situs (mis. https://komikedu.id) untuk mengambil potret tokoh preset dari /public */
  assetOrigin?: string,
): Promise<GenerateResult> {
  const { data: comic } = await supabase
    .from("comics")
    .select("id, user_id, jenjang, gaya, cerita, tokoh_json, karakter_json, ref_halaman_url")
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

  const provider = await getImageProvider();
  const pemakaian: Pemakaian[] = [];
  try {
    const gaya = GAYA.find((g) => g.id === comic.gaya) ?? GAYA[0];

    // lembar karakter: tokoh pilihan guru dipakai apa adanya; tokoh lain di naskah dibuatkan deskripsi
    // sekali per komik lalu disimpan, agar setiap halaman memakai deskripsi yang sama
    let tokoh = ((comic.tokoh_json as Tokoh[] | null) ?? []).filter((t) => t.nama && t.deskripsi);
    let karakter = (comic.karakter_json as KarakterSheet | null) ?? null;
    let refHalaman: string | null = comic.ref_halaman_url;
    // tokoh diganti guru setelah gambar pertama dibuat: susun ulang lembar karakter dan jangan pakai
    // halaman lama sebagai referensi (tokoh lama akan "menular" ke halaman baru)
    const tokohBerubah = karakter !== null && !sheetCocok(karakter, tokoh);
    if (tokohBerubah && refHalaman) {
      refHalaman = null;
      await admin.from("comics").update({ ref_halaman_url: null }).eq("id", comicId);
    }
    if (!karakter || tokohBerubah) {
      const { data: semua } = await supabase.from("pages").select("panels(script_json)").eq("comic_id", comicId);
      const scripts = (semua ?? []).flatMap((pg) => ((pg.panels ?? []) as { script_json: PanelRow["script_json"] }[]).map((p) => p.script_json ?? {}));
      const dipilih = new Set(tokoh.map((t) => t.nama.toLowerCase()));
      const lainnya = namaTokoh(scripts).filter((n) => !dipilih.has(n.toLowerCase()));
      const tambahan = lainnya.length
        ? await rekamPemakaian(pemakaian, () => generateCharacterSheet(lainnya, { jenjang: comic.jenjang, gaya: gaya.prompt, cerita: comic.cerita }))
        : [];
      karakter = [...tokoh.map((t) => ({ nama: t.nama, deskripsi: t.deskripsi })), ...tambahan];
      await admin.from("comics").update({ karakter_json: karakter }).eq("id", comicId);
    }

    // tokoh dari naskah yang belum ada di daftar (mis. "Siti") ikut masuk tab Tokoh agar bisa diganti guru
    const tambah = tambahTokohDariSheet(tokoh, karakter);
    if (tambah.tokoh.length > tokoh.length) {
      tokoh = tambah.tokoh;
      karakter = tambah.sheet;
      await admin.from("comics").update({ tokoh_json: tokoh, karakter_json: karakter }).eq("id", comicId);
    }

    // gambar referensi (maks. 3): potret tokoh (preset atau buatan AI) yang muncul di halaman ini, lalu halaman pertama komik
    const ambil = async (url: string, label: string) => {
      const r = await fetch(url);
      return r.ok ? { data: new Uint8Array(await r.arrayBuffer()), mimeType: r.headers.get("content-type") ?? "image/webp", label } : null;
    };
    const teksHalaman = panels
      .map((p, i) => [adegan[i], ...(p.script_json?.karakter ?? []), ...(p.script_json?.dialog ?? []).map((d) => d.karakter)].join(" "))
      .join(" ")
      .toLowerCase();
    const tampil = tokoh.filter((t) => punyaPotret(t) && teksHalaman.includes(t.nama.toLowerCase()));
    // potret tokoh didahulukan (maks. 3 gambar acuan): hanya itu yang menentukan wajah. Halaman sebelumnya hanya
    // menambah kesamaan gaya, dan dipakai kalau masih ada tempat, karena tokoh di sana bisa saja tidak konsisten
    const slotTokoh = 3;
    const referenceImages = (
      await Promise.all([
        ...tampil.slice(0, slotTokoh).map((t) => potretTokoh(admin, userId, comicId, t, comic.gaya, assetOrigin)),
        ...(refHalaman && tampil.slice(0, slotTokoh).length < 3
          ? [ambil(refHalaman, "halaman komik sebelumnya (hanya untuk kesamaan gaya gambar dan suasana; wajah tokoh ikuti potret masing-masing)")]
          : []),
      ])
    ).filter((r): r is NonNullable<typeof r> => r !== null);

    const rects = panels.map((p) => {
      const pos = p.posisi ?? { x: 0, y: 0, w: PAGE_W, h: PAGE_H };
      return { x: pos.x / PAGE_W, y: pos.y / PAGE_H, w: pos.w / PAGE_W, h: pos.h / PAGE_H };
    });
    const hasil = await rekamPemakaian(pemakaian, () =>
      provider.generatePage({
        gaya: gaya.prompt,
        karakter,
        referenceImages,
        panels: panels.map((p, i) => ({ adegan: adegan[i], karakter: p.script_json?.karakter ?? [], rect: rects[i] })),
      }),
    );

    const crops = await cropPanels(hasil.image, rects);
    const stamp = Date.now();
    const base = `${userId}/${comicId}`;
    const uploaded: { id: string; imageUrl: string }[] = [];
    for (let i = 0; i < panels.length; i++) {
      const path = `${base}/${panels[i].id}-${stamp}.webp`;
      uploaded.push({ id: panels[i].id, imageUrl: await simpanGambar(admin, path, crops[i].image, "image/webp") });
    }

    if (!refHalaman) {
      const full = await sharp(hasil.image).resize({ width: 768 }).webp({ quality: 80 }).toBuffer();
      const path = `${base}/halaman-${pageId}-${stamp}.webp`;
      // halaman referensi hanya membantu konsistensi; gagal menyimpannya tidak menggagalkan gambar
      try {
        await admin.from("comics").update({ ref_halaman_url: await simpanGambar(admin, path, full, "image/webp") }).eq("id", comicId);
      } catch (e) {
        console.error("simpan halaman referensi gagal", e);
      }
    }

    for (const u of uploaded) {
      const { error } = await admin.from("panels").update({ image_url: u.imageUrl, status: "selesai" }).eq("id", u.id);
      if (error) throw error;
      await catatVersi(admin, u.id, u.imageUrl, "halaman");
    }
    await admin.from("generations").insert(barisGenerations(pemakaian, { user_id: userId, jenis: "gambar", provider: hasil.provider, status: "selesai" }));
    const { data: profil } = await admin.from("users").select("saldo_kredit").eq("id", userId).single();
    return { ok: true, panels: uploaded, saldo: profil?.saldo_kredit ?? 0, tokoh, karakter };
  } catch (e) {
    console.error("generatePageImage gagal", pageId, e);
    await admin.rpc("refund_credits", { p_user: userId, p_amount: GAMBAR_COST, p_alasan: "refund gambar gagal", p_ref: pageId });
    await admin.from("panels").update({ status: "gagal" }).eq("page_id", pageId);
    await admin.from("generations").insert(barisGenerations(pemakaian, { user_id: userId, jenis: "gambar", provider: provider.name, status: "gagal" }));
    const diblokir = e instanceof Error && /diblokir|tidak mengembalikan gambar/i.test(e.message);
    return {
      ok: false,
      error: kuotaHabis(e)
        ? PESAN_KUOTA
        : diblokir
          ? "Gambar tidak bisa dibuat untuk adegan ini. Coba ubah deskripsi adegannya. Kredit sudah dikembalikan."
          : "Gagal membuat gambar. Kredit sudah dikembalikan, silakan coba lagi.",
      status: kuotaHabis(e) ? 503 : 500,
    };
  }
}
