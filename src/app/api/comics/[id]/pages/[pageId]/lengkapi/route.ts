import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { lengkapiPanelKosong, type HalamanTetangga } from "@/lib/ai/lengkapi";
import { barisGenerations, rekamPemakaian, type Pemakaian } from "@/lib/ai/usage";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

/** Isi halaman dari editor (bisa belum tersimpan): urutan panel, adegan, dan teks balon per panel. */
const BodySchema = z.object({
  panels: z
    .array(
      z.object({
        id: z.string().uuid(),
        adegan: z.string().max(1000),
        dialog: z.array(z.object({ jenis: z.enum(["bicara", "pikir", "narasi"]), teks: z.string().max(300) })).max(6),
      }),
    )
    .min(1)
    .max(12),
});

type PanelDb = { urutan: number; adegan: string | null; script_json: { adegan?: string; dialog?: { teks: string }[] } | null };

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; pageId: string }> }) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false, error: "Origin tidak diizinkan" }, { status: 403 });
  }
  const { id, pageId } = await params;
  if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(pageId).success) {
    return NextResponse.json({ ok: false, error: "Permintaan tidak valid" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Sesi berakhir, silakan login lagi" }, { status: 401 });

  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ ok: false, error: "Data halaman tidak valid" }, { status: 400 });
  if (!body.data.panels.some((p) => !p.adegan.trim())) {
    return NextResponse.json({ ok: false, error: "Semua panel sudah punya adegan" }, { status: 400 });
  }

  const { data: comic } = await supabase.from("comics").select("user_id, judul, topik, jenjang, mapel, cerita").eq("id", id).maybeSingle();
  if (!comic || comic.user_id !== user.id) return NextResponse.json({ ok: false, error: "Komik tidak ditemukan" }, { status: 404 });

  // konteks halaman sebelum dan sesudahnya (dari versi tersimpan)
  const [{ data: halaman }, { data: materi }] = await Promise.all([
    supabase.from("pages").select("id, urutan, panels(urutan, adegan, script_json)").eq("comic_id", id).order("urutan"),
    supabase.from("source_materials").select("teks_ekstraksi").eq("comic_id", id).maybeSingle(),
  ]);
  const idx = (halaman ?? []).findIndex((h) => h.id === pageId);
  const tetangga: HalamanTetangga[] = [];
  for (const [posisi, j] of [
    ["sebelumnya", idx - 1],
    ["berikutnya", idx + 1],
  ] as const) {
    const h = idx >= 0 ? halaman?.[j] : undefined;
    if (!h) continue;
    const panel = [...((h.panels ?? []) as PanelDb[])]
      .sort((a, b) => a.urutan - b.urutan)
      .map((p) => ({ adegan: (p.adegan ?? p.script_json?.adegan ?? "").trim(), dialog: (p.script_json?.dialog ?? []).map((d) => d.teks) }))
      .filter((p) => p.adegan);
    if (panel.length) tetangga.push({ posisi, panel });
  }

  const pemakaian: Pemakaian[] = [];
  // gratis bagi guru, tapi tetap dicatat agar biaya AI terlihat
  const catat = (status: "selesai" | "gagal") =>
    createAdminClient().from("generations").insert(barisGenerations(pemakaian, { user_id: user.id, jenis: "lengkapi", provider: "gemini", status }));
  try {
    const hasil = await rekamPemakaian(pemakaian, () => lengkapiPanelKosong({
      topik: comic.topik?.trim() || comic.judul,
      jenjang: comic.jenjang,
      mapel: comic.mapel,
      cerita: comic.cerita,
      materi: materi?.teks_ekstraksi,
      panels: body.data.panels,
      tetangga,
    }));
    await catat(hasil.panels.length ? "selesai" : "gagal");
    if (!hasil.panels.length) return NextResponse.json({ ok: false, error: "AI belum berhasil mengisi panel. Coba lagi." }, { status: 502 });
    return NextResponse.json({ ok: true, ...hasil });
  } catch (e) {
    console.error("lengkapi naskah gagal", pageId, e);
    await catat("gagal");
    return NextResponse.json({ ok: false, error: "Gagal melengkapi naskah. Coba lagi." }, { status: 500 });
  }
}
