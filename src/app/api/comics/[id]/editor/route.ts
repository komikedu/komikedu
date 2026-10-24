import { NextResponse, type NextRequest } from "next/server";
import { saveEditorData } from "@/lib/editor/save";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const MAX_BODY_BYTES = 1_000_000;

/**
 * Simpan isi editor. Memakai route handler (bukan server action) supaya klien bisa memakai
 * fetch keepalive saat pengguna meninggalkan halaman: server action ikut dibatalkan oleh navigasi.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // tolak permintaan lintas-situs; fetch JSON lintas-origin juga sudah diblok CORS preflight
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false, error: "Origin tidak diizinkan" }, { status: 403 });
  }

  const len = Number(request.headers.get("content-length") ?? 0);
  if (len > MAX_BODY_BYTES) return NextResponse.json({ ok: false, error: "Data terlalu besar" }, { status: 413 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Sesi berakhir, silakan login lagi" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Data tidak valid" }, { status: 400 });
  }

  const { id } = await params;
  // bentuk baru: { pages, ukuran }; bentuk lama (hanya daftar halaman) tetap diterima
  const { pages, ukuran } = Array.isArray(body) ? { pages: body, ukuran: undefined } : ((body ?? {}) as { pages?: unknown; ukuran?: { w: unknown; h: unknown } });
  const res = await saveEditorData(supabase, user.id, id, pages, createAdminClient(), ukuran);
  return res.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ ok: false, error: res.error }, { status: res.status });
}
