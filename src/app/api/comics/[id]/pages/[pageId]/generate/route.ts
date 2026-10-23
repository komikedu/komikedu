import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { generatePageImage } from "@/lib/comics/generate-page";
import { createAdminClient, createClient } from "@/lib/supabase/server";

// satu gambar halaman (Nano Banana) bisa 20-60 detik
export const maxDuration = 120;

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

  const res = await generatePageImage(supabase, createAdminClient(), user.id, id, pageId, request.nextUrl.origin);
  return res.ok ? NextResponse.json(res) : NextResponse.json({ ok: false, error: res.error }, { status: res.status });
}
