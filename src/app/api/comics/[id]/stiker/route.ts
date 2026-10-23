import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { MAX_STIKER_BYTES, simpanStiker } from "@/lib/comics/stiker";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/** Simpan gambar stiker komik (mis. tokoh tanpa latar). Form-data: file. Gratis. */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false, error: "Origin tidak diizinkan" }, { status: 403 });
  }
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ ok: false, error: "Permintaan tidak valid" }, { status: 400 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Sesi berakhir, silakan login lagi" }, { status: 401 });

  const len = Number(request.headers.get("content-length") ?? 0);
  if (len > MAX_STIKER_BYTES + 100_000) return NextResponse.json({ ok: false, error: "Ukuran gambar maksimal 8 MB" }, { status: 413 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Pilih berkas gambar" }, { status: 400 });

  const res = await simpanStiker(supabase, createAdminClient(), user.id, id, new Uint8Array(await file.arrayBuffer()));
  return res.ok ? NextResponse.json(res) : NextResponse.json({ ok: false, error: res.error }, { status: res.status });
}
