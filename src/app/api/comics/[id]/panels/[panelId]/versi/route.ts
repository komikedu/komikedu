import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { daftarVersi, pilihVersi } from "@/lib/comics/versi-gambar";
import { createAdminClient, createClient } from "@/lib/supabase/server";

type Konteks = { params: Promise<{ id: string; panelId: string }> };

async function siapkan(request: NextRequest, { params }: Konteks, ubah: boolean) {
  const origin = request.headers.get("origin");
  if (ubah && origin && origin !== request.nextUrl.origin) return { galat: NextResponse.json({ ok: false, error: "Origin tidak diizinkan" }, { status: 403 }) };
  const { id, panelId } = await params;
  if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(panelId).success) {
    return { galat: NextResponse.json({ ok: false, error: "Permintaan tidak valid" }, { status: 400 }) };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { galat: NextResponse.json({ ok: false, error: "Sesi berakhir, silakan login lagi" }, { status: 401 }) };
  return { id, panelId, supabase };
}

const balas = (res: { ok: true } | { ok: false; error: string; status: number }) =>
  res.ok ? NextResponse.json(res) : NextResponse.json({ ok: false, error: res.error }, { status: res.status });

/** Daftar versi gambar sebuah panel, dari yang paling lama. */
export async function GET(request: NextRequest, konteks: Konteks) {
  const s = await siapkan(request, konteks, false);
  if ("galat" in s) return s.galat;
  return balas(await daftarVersi(s.supabase, s.id, s.panelId));
}

/** Ganti gambar panel ke salah satu versi lamanya. Body: { versiId }. Tidak memakai kredit. */
export async function POST(request: NextRequest, konteks: Konteks) {
  const s = await siapkan(request, konteks, true);
  if ("galat" in s) return s.galat;
  const body = z.object({ versiId: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ ok: false, error: "Permintaan tidak valid" }, { status: 400 });
  return balas(await pilihVersi(s.supabase, createAdminClient(), s.id, s.panelId, body.data.versiId));
}
