import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { analisisTokoh } from "@/lib/comics/analisis-tokoh";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

/** Cari tokoh dalam cerita sumber komik dengan AI. Gratis; hanya mengembalikan usulan tokoh, tidak mengubah data. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ ok: false, error: "Origin tidak diizinkan" }, { status: 403 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ ok: false, error: "Permintaan tidak valid" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Sesi berakhir, silakan login lagi" }, { status: 401 });

  const res = await analisisTokoh(supabase, createAdminClient(), user.id, id);
  return res.ok ? NextResponse.json(res) : NextResponse.json({ ok: false, error: res.error }, { status: res.status });
}
