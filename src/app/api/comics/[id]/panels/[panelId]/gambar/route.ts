import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { MAX_UNGGAH_PANEL_BYTES, unggahGambarPanel } from "@/lib/comics/unggah-panel";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/** Unggah gambar sendiri ke sebuah panel (gratis). Form-data: file. */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; panelId: string }> }) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false, error: "Origin tidak diizinkan" }, { status: 403 });
  }
  const { id, panelId } = await params;
  if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(panelId).success) {
    return NextResponse.json({ ok: false, error: "Permintaan tidak valid" }, { status: 400 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Sesi berakhir, silakan login lagi" }, { status: 401 });

  const len = Number(request.headers.get("content-length") ?? 0);
  if (len > MAX_UNGGAH_PANEL_BYTES + 100_000) return NextResponse.json({ ok: false, error: "Ukuran gambar maksimal 8 MB" }, { status: 413 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Pilih berkas gambar" }, { status: 400 });

  const res = await unggahGambarPanel(supabase, createAdminClient(), user.id, id, panelId, new Uint8Array(await file.arrayBuffer()), form?.get("sumber") === "tanpa-latar" ? "tanpa-latar" : "unggah");
  return res.ok ? NextResponse.json(res) : NextResponse.json({ ok: false, error: res.error }, { status: res.status });
}
