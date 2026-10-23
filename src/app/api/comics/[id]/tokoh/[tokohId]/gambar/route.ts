import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { buatGambarTokoh, MAX_UNGGAH_BYTES, unggahGambarTokoh } from "@/lib/comics/gambar-tokoh";
import { createAdminClient, createClient } from "@/lib/supabase/server";

// satu gambar (Nano Banana) bisa 10-40 detik
export const maxDuration = 90;

const JenisSchema = z.enum(["potret", "badan"]);

type Konteks = { params: Promise<{ id: string; tokohId: string }> };

/** Pemeriksaan bersama: origin, id, dan sesi. Mengembalikan galat siap kirim, atau data yang dibutuhkan. */
async function siapkan(request: NextRequest, { params }: Konteks) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return { galat: NextResponse.json({ ok: false, error: "Origin tidak diizinkan" }, { status: 403 }) };
  const { id, tokohId } = await params;
  if (!z.string().uuid().safeParse(id).success || !z.string().min(1).max(40).safeParse(tokohId).success) {
    return { galat: NextResponse.json({ ok: false, error: "Permintaan tidak valid" }, { status: 400 }) };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { galat: NextResponse.json({ ok: false, error: "Sesi berakhir, silakan login lagi" }, { status: 401 }) };
  return { id, tokohId, supabase, user };
}

const balas = (res: { ok: true } | { ok: false; error: string; status: number }) =>
  res.ok ? NextResponse.json(res) : NextResponse.json({ ok: false, error: res.error }, { status: res.status });

/** Buat potret atau badan penuh dengan AI (memakai 1 kredit). Body: { jenis: "potret" | "badan" }. */
export async function POST(request: NextRequest, konteks: Konteks) {
  const s = await siapkan(request, konteks);
  if ("galat" in s) return s.galat;
  const body = z.object({ jenis: JenisSchema }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ ok: false, error: "Jenis gambar tidak valid" }, { status: 400 });
  return balas(await buatGambarTokoh(s.supabase, createAdminClient(), s.user.id, s.id, s.tokohId, body.data.jenis, request.nextUrl.origin));
}

/** Unggah gambar sendiri (gratis). Form-data: file; query: ?jenis=potret|badan. */
export async function PUT(request: NextRequest, konteks: Konteks) {
  const s = await siapkan(request, konteks);
  if ("galat" in s) return s.galat;
  const jenis = JenisSchema.safeParse(request.nextUrl.searchParams.get("jenis"));
  if (!jenis.success) return NextResponse.json({ ok: false, error: "Jenis gambar tidak valid" }, { status: 400 });
  const len = Number(request.headers.get("content-length") ?? 0);
  if (len > MAX_UNGGAH_BYTES + 100_000) return NextResponse.json({ ok: false, error: "Ukuran gambar maksimal 5 MB" }, { status: 413 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Pilih berkas gambar" }, { status: 400 });
  return balas(await unggahGambarTokoh(s.supabase, createAdminClient(), s.user.id, s.id, s.tokohId, jenis.data, new Uint8Array(await file.arrayBuffer())));
}
