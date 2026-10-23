import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { daftarGaleriTokoh, pasangGambarTokoh } from "@/lib/comics/galeri-tokoh";
import { createAdminClient, createClient } from "@/lib/supabase/server";

type Konteks = { params: Promise<{ id: string; tokohId: string }> };

async function siapkan(request: NextRequest, { params }: Konteks, ubah: boolean) {
  const origin = request.headers.get("origin");
  if (ubah && origin && origin !== request.nextUrl.origin) return { galat: NextResponse.json({ ok: false, error: "Origin tidak diizinkan" }, { status: 403 }) };
  const { id, tokohId } = await params;
  if (!z.string().uuid().safeParse(id).success || !z.string().min(1).max(40).safeParse(tokohId).success) {
    return { galat: NextResponse.json({ ok: false, error: "Permintaan tidak valid" }, { status: 400 }) };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { galat: NextResponse.json({ ok: false, error: "Sesi berakhir, silakan login lagi" }, { status: 401 }) };
  return { id, tokohId, supabase };
}

const balas = (res: { ok: true } | { ok: false; error: string; status: number }) =>
  res.ok ? NextResponse.json(res) : NextResponse.json({ ok: false, error: res.error }, { status: res.status });

/** Galeri gambar tokoh, dari yang terbaru. Query: ?jenis=potret|badan. */
export async function GET(request: NextRequest, konteks: Konteks) {
  const s = await siapkan(request, konteks, false);
  if ("galat" in s) return s.galat;
  const jenis = z.enum(["potret", "badan"]).safeParse(request.nextUrl.searchParams.get("jenis"));
  if (!jenis.success) return NextResponse.json({ ok: false, error: "Jenis gambar tidak valid" }, { status: 400 });
  return balas(await daftarGaleriTokoh(s.supabase, s.id, s.tokohId, jenis.data));
}

/** Pasang gambar dari galeri sebagai gambar aktif tokoh. Body: { gambarId }. Tidak memakai kredit. */
export async function POST(request: NextRequest, konteks: Konteks) {
  const s = await siapkan(request, konteks, true);
  if ("galat" in s) return s.galat;
  const body = z.object({ gambarId: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ ok: false, error: "Permintaan tidak valid" }, { status: 400 });
  return balas(await pasangGambarTokoh(s.supabase, createAdminClient(), s.id, s.tokohId, body.data.gambarId));
}
