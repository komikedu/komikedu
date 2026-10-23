import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { siapkanTokohNaskah } from "@/lib/comics/tokoh-naskah";
import { createAdminClient, createClient } from "@/lib/supabase/server";

// satu panggilan AI kecil untuk menulis deskripsi tokoh
export const maxDuration = 60;

/** Tambahkan tokoh dari naskah ke daftar tokoh komik. Body: { nama: string[] }. Tidak memakai kredit (potret dibuat terpisah). */
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

  const body = (await request.json().catch(() => null)) as { nama?: unknown } | null;
  const res = await siapkanTokohNaskah(supabase, createAdminClient(), user.id, id, body?.nama);
  return res.ok ? NextResponse.json(res) : NextResponse.json({ ok: false, error: res.error }, { status: res.status });
}
