/**
 * Diagnosa konfigurasi dan kesehatan server, untuk mencari penyebab halaman 500 di produksi tanpa membuka log hosting.
 * Tidak pernah mengembalikan isi kunci atau rahasia: hanya nama variabel, jenis kunci, dan pesan galat.
 */

type Env = Record<string, string | undefined>;
type Klien = { from: (t: string) => { select: (k: string, o?: { count?: "exact"; head?: boolean }) => PromiseLike<{ error: { message: string } | null }> } };

/** Variabel yang wajib agar halaman dasar jalan. */
export const ENV_WAJIB = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;

/** Variabel pendukung: tanpa ini fitur tertentu mati (admin, pembuat gambar, penyimpanan R2). */
export const ENV_PENDUKUNG = [
  "ADMIN_EMAILS",
  "IMAGE_PROVIDER",
  "GEMINI_API_KEY",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_URL",
] as const;

/** Kolom tabel comics yang dibaca halaman publik dan editor; dipakai untuk mendeteksi migrasi yang belum diterapkan. */
export const KOLOM_COMICS = [
  "id", "judul", "jenjang", "status", "is_public", "halaman_publik", "deskripsi_publik", "diterbitkan_at", "gaya",
  "lebar_halaman", "tinggi_halaman", "tema", "bahasa", "dengan_sampul", "sumber", "naskah_status", "tokoh_json",
] as const;

const terisi = (v: string | undefined) => !!v?.trim();

/** Nama variabel dari `daftar` yang tidak ada atau hanya berisi spasi. */
export const envHilang = (env: Env, daftar: readonly string[] = ENV_WAJIB): string[] => daftar.filter((n) => !terisi(env[n]));

export type JenisKunci = "kosong" | "anon" | "service_role" | "publishable" | "secret" | "jwt-lain" | "tidak-dikenal";

/** Jenis kunci Supabase tanpa membuka isinya: JWT dibaca klaim `role`-nya, kunci format baru dikenali dari awalan. */
export function jenisKunci(kunci: string | undefined): JenisKunci {
  const k = kunci?.trim();
  if (!k) return "kosong";
  if (k.startsWith("sb_publishable_")) return "publishable";
  if (k.startsWith("sb_secret_")) return "secret";
  const bagian = k.split(".");
  if (bagian.length !== 3) return "tidak-dikenal";
  try {
    const role = (JSON.parse(Buffer.from(bagian[1], "base64url").toString("utf8")) as { role?: string }).role;
    return role === "anon" ? "anon" : role === "service_role" ? "service_role" : "jwt-lain";
  } catch {
    return "tidak-dikenal";
  }
}

const KUNCI_RAHASIA: JenisKunci[] = ["service_role", "secret"];

/** Kesalahan konfigurasi yang bisa diketahui dari variabel lingkungan saja (tanpa menghubungi apa pun). */
export function masalahKonfigurasi(env: Env): string[] {
  const masalah = envHilang(env).map((n) => `${n} belum diisi atau kosong`);
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const servis = env.SUPABASE_SERVICE_ROLE_KEY;
  const jenisServis = jenisKunci(servis);
  if (terisi(servis) && !KUNCI_RAHASIA.includes(jenisServis)) {
    masalah.push(
      `SUPABASE_SERVICE_ROLE_KEY berisi kunci ${jenisServis === "anon" || jenisServis === "publishable" ? "publik (anon/publishable)" : "yang bukan service_role"}, seharusnya kunci service_role atau secret`,
    );
  }
  if (terisi(anon) && KUNCI_RAHASIA.includes(jenisKunci(anon))) {
    masalah.push("NEXT_PUBLIC_SUPABASE_ANON_KEY berisi kunci RAHASIA (service_role/secret) yang ikut terkirim ke peramban; ganti dengan kunci anon/publishable dan buat ulang kunci rahasia");
  }
  if (terisi(anon) && anon?.trim() === servis?.trim()) masalah.push("NEXT_PUBLIC_SUPABASE_ANON_KEY dan SUPABASE_SERVICE_ROLE_KEY berisi nilai yang sama");
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (url && !/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(url)) {
    masalah.push("NEXT_PUBLIC_SUPABASE_URL bukan alamat project Supabase (harus berbentuk https://xxxx.supabase.co tanpa jalur tambahan)");
  }
  return masalah;
}

export type HasilPeriksa = { nama: string; ok: boolean; detail: string };

/** Uji koneksi service role dan keberadaan tiap kolom comics yang dibutuhkan (kolom hilang = migrasi belum diterapkan). */
export async function periksaDatabase(admin: Klien): Promise<HasilPeriksa[]> {
  const koneksi = await admin.from("comics").select("id", { count: "exact", head: true });
  const hasil: HasilPeriksa[] = [{ nama: "Koneksi database (service role)", ok: !koneksi.error, detail: koneksi.error?.message ?? "tersambung" }];
  if (koneksi.error) return hasil;

  // waktu satu permintaan dari server ini ke Supabase: penyebab utama halaman terasa lambat bila tiap halaman memanggilnya berurutan
  const waktu: number[] = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    await admin.from("comics").select("id", { head: true });
    waktu.push(Math.round(performance.now() - t0));
  }
  const rata = Math.round(waktu.reduce((a, b) => a + b, 0) / waktu.length);
  hasil.push({
    nama: "Waktu satu permintaan ke database",
    ok: rata < 400,
    detail: `${rata} ms rata-rata (${waktu.join(", ")} ms)${rata >= 400 ? ": lambat; periksa jarak wilayah fungsi server dengan wilayah database, dan kurangi permintaan berurutan per halaman" : ""}`,
  });

  const kolom = await Promise.all(KOLOM_COMICS.map(async (k) => ({ k, error: (await admin.from("comics").select(k, { head: true })).error })));
  const hilang = kolom.filter((c) => c.error).map((c) => c.k);
  hasil.push({
    nama: "Kolom tabel comics",
    ok: hilang.length === 0,
    detail: hilang.length ? `kolom tidak ada atau tidak bisa dibaca: ${hilang.join(", ")} (migrasi belum diterapkan?)` : `${KOLOM_COMICS.length} kolom lengkap`,
  });
  return hasil;
}

/** Uji pemuatan modul pengolah gambar (sharp); gagal di hosting biasanya berarti biner native tidak ikut terbawa. */
export async function periksaSharp(): Promise<HasilPeriksa> {
  try {
    const sharp = (await import("sharp")).default;
    await sharp({ create: { width: 2, height: 2, channels: 3, background: "#fff" } }).png().toBuffer();
    return { nama: "Pengolah gambar (sharp)", ok: true, detail: "berfungsi" };
  } catch (e) {
    return { nama: "Pengolah gambar (sharp)", ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}
