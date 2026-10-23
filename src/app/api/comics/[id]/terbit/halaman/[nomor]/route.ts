import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { MAX_BYTES_HALAMAN, simpanHalamanRilis } from "@/lib/comics/salinan-publik";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/**
 * Unggah satu halaman salinan terbit (JPEG mentah di body). Satu permintaan per halaman agar tiap permintaan
 * kecil (batas ukuran body di hosting serverless) dan kemajuan bisa ditampilkan. Berkas baru dipakai setelah
 * komik diterbitkan lewat aksi terbitkan, yang memeriksa bahwa semua halaman sudah ada.
 * Query: ?rilis=<uuid penerbitan>.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; nomor: string }> }) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ ok: false, error: "Origin tidak diizinkan" }, { status: 403 });

  const { id, nomor } = await params;
  const rilis = request.nextUrl.searchParams.get("rilis") ?? "";
  if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(rilis).success || !/^\d{1,2}$/.test(nomor)) {
    return NextResponse.json({ ok: false, error: "Permintaan tidak valid" }, { status: 400 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES_HALAMAN + 1024) {
    return NextResponse.json({ ok: false, error: "Ukuran gambar halaman maksimal 3 MB" }, { status: 413 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Sesi berakhir, silakan login lagi" }, { status: 401 });

  const res = await simpanHalamanRilis(supabase, createAdminClient(), user.id, id, rilis, Number(nomor), new Uint8Array(await request.arrayBuffer()));
  return res.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: res.error }, { status: res.status });
}
