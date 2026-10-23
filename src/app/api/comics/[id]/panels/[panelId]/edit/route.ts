import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { editPanelImage, InstruksiSchema } from "@/lib/comics/edit-panel";
import { createAdminClient, createClient } from "@/lib/supabase/server";

// satu edit gambar (Nano Banana) bisa 15-40 detik
export const maxDuration = 120;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; panelId: string }> }) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false, error: "Origin tidak diizinkan" }, { status: 403 });
  }

  const { id, panelId } = await params;
  if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(panelId).success) {
    return NextResponse.json({ ok: false, error: "Permintaan tidak valid" }, { status: 400 });
  }
  const body = z.object({ instruksi: InstruksiSchema }).safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ ok: false, error: body.error.issues[0]?.message ?? "Permintaan tidak valid" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Sesi berakhir, silakan login lagi" }, { status: 401 });

  const res = await editPanelImage(supabase, createAdminClient(), user.id, id, panelId, body.data.instruksi, request.nextUrl.origin);
  return res.ok ? NextResponse.json(res) : NextResponse.json({ ok: false, error: res.error }, { status: res.status });
}
