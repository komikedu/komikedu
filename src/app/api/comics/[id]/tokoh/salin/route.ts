import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { salinTokoh } from "@/lib/comics/salin-tokoh";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const Body = z.object({ dariComicId: z.string().uuid(), tokohId: z.string().min(1).max(40) });

/** Pakai ulang tokoh buatan sendiri dari komik lain milik pengguna. Body: { dariComicId, tokohId }. Gratis. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ ok: false, error: "Origin tidak diizinkan" }, { status: 403 });
  const { id } = await params;
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!z.string().uuid().safeParse(id).success || !body.success) return NextResponse.json({ ok: false, error: "Permintaan tidak valid" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Sesi berakhir, silakan login lagi" }, { status: 401 });

  const res = await salinTokoh(supabase, createAdminClient(), user.id, id, body.data.dariComicId, body.data.tokohId);
  return res.ok ? NextResponse.json(res) : NextResponse.json({ ok: false, error: res.error }, { status: res.status });
}
