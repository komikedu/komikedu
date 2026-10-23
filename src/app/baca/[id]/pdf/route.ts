import { NextResponse, type NextRequest } from "next/server";
import { bacaKomikPublik } from "@/lib/comics/komunitas";
import { buatPdf, namaBerkasPdf } from "@/lib/editor/ekspor-pdf";
import { ambilGambar } from "@/lib/storage/gambar";
import { createAdminClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Unduh komik terbit sebagai PDF. Dirakit dari salinan tetap halaman yang disimpan saat komik diterbitkan (sama dengan yang
 * dibaca di web), jadi isinya tidak berubah oleh edit setelahnya. Bisa diunduh tanpa login; komik yang ditarik menjadi 404.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Komik tidak ditemukan" }, { status: 404 });
  const admin = createAdminClient();
  const data = await bacaKomikPublik(admin, id);
  if (!data) return NextResponse.json({ error: "Komik tidak ditemukan" }, { status: 404 });

  const jpegs: Uint8Array[] = [];
  for (const url of data.halaman) {
    const gambar = await ambilGambar(admin, url);
    if (!gambar) return NextResponse.json({ error: "Halaman komik tidak bisa dimuat" }, { status: 502 });
    jpegs.push(gambar.data);
  }
  const pdf = await buatPdf(jpegs, data.komik.judul);
  const nama = namaBerkasPdf(data.komik.judul);
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nama}"; filename*=UTF-8''${encodeURIComponent(nama)}`,
      // salinan tetap per penerbitan, jadi aman di-cache sebentar; komik yang ditarik berhenti terlayani saat cache habis
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
