import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { ENV_PENDUKUNG, ENV_WAJIB, envHilang, jenisKunci, masalahKonfigurasi, periksaDatabase, periksaSharp, type HasilPeriksa } from "@/lib/diagnosa";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const tanpaCache = { "cache-control": "no-store" };

/**
 * Diagnosa server. Tanpa login admin: hanya status dan daftar masalah konfigurasi (nama variabel, bukan isinya), cukup untuk
 * mengetahui apa yang kurang. Admin yang masuk (ADMIN_EMAILS) mendapat pemeriksaan lengkap: koneksi database, kolom yang hilang,
 * pengolah gambar, dan jenis tiap kunci. Isi kunci tidak pernah ditampilkan.
 */
export async function GET() {
  const masalah = masalahKonfigurasi(process.env);
  const versi = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "lokal";

  let admin = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    admin = isAdminEmail(user?.email);
  } catch {
    // sesi tidak bisa dibaca (mis. variabel Supabase hilang): perlakukan sebagai bukan admin
  }

  if (!admin) {
    return NextResponse.json(
      { ok: masalah.length === 0, versi, masalah, catatan: "Pemeriksaan lengkap hanya untuk admin yang sudah masuk (email ada di ADMIN_EMAILS)." },
      { status: masalah.length ? 503 : 200, headers: tanpaCache },
    );
  }

  const pemeriksaan: HasilPeriksa[] = [];
  try {
    pemeriksaan.push(...(await periksaDatabase(createAdminClient())));
  } catch (e) {
    pemeriksaan.push({ nama: "Koneksi database (service role)", ok: false, detail: e instanceof Error ? e.message : String(e) });
  }
  pemeriksaan.push(await periksaSharp());

  const ok = masalah.length === 0 && pemeriksaan.every((p) => p.ok);
  return NextResponse.json(
    {
      ok,
      versi,
      lingkungan: { vercel: process.env.VERCEL_ENV ?? "bukan-vercel", wilayah: process.env.VERCEL_REGION ?? null, node: process.version },
      masalah,
      pemeriksaan,
      variabel: {
        wajib: Object.fromEntries(ENV_WAJIB.map((n) => [n, envHilang(process.env, [n]).length ? "KOSONG" : "ada"])),
        pendukung: Object.fromEntries(ENV_PENDUKUNG.map((n) => [n, envHilang(process.env, [n]).length ? "kosong" : "ada"])),
        jenisKunci: { anon: jenisKunci(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY), servis: jenisKunci(process.env.SUPABASE_SERVICE_ROLE_KEY) },
      },
    },
    { status: ok ? 200 : 503, headers: tanpaCache },
  );
}
