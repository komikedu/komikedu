import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { tokohNaskahBelumAda } from "@/lib/comics/tokoh-naskah";
import { createClient } from "@/lib/supabase/server";

/** Tokoh yang disebut di naskah sebuah halaman tetapi belum ada di daftar tokoh. Query: ?halaman=<id halaman>. Hanya membaca. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const halaman = request.nextUrl.searchParams.get("halaman") ?? "";
  if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(halaman).success) {
    return NextResponse.json({ ok: false, error: "Permintaan tidak valid" }, { status: 400 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Sesi berakhir, silakan login lagi" }, { status: 401 });

  const res = await tokohNaskahBelumAda(supabase, id, halaman);
  return res.ok ? NextResponse.json(res) : NextResponse.json({ ok: false, error: res.error }, { status: res.status });
}
