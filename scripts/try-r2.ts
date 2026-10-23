// Uji koneksi R2: simpan berkas kecil, baca lewat URL publik (dengan header Origin untuk cek CORS), unduh lewat S3, lalu hapus.
// Jalankan: node --env-file=.env.local --conditions=react-server --import tsx scripts/try-r2.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { ambilGambar, hapusGambar, penyimpananAktif, simpanGambar } from "../src/lib/storage/gambar";

const tidakDipakai = null as unknown as SupabaseClient; // hanya dipakai bila R2 tidak aktif
const origin = process.env.R2_TEST_ORIGIN ?? "http://localhost:3001";

async function main() {
  console.log("penyimpanan aktif:", penyimpananAktif());
  if (penyimpananAktif() !== "r2") throw new Error("R2 belum aktif: periksa kelima variabel R2_* di .env.local, lalu jalankan ulang");

  const key = `uji-r2/${Date.now()}.txt`;
  const isi = new TextEncoder().encode("uji koneksi komikedu");
  const url = await simpanGambar(tidakDipakai, key, isi, "text/plain");
  console.log("simpan OK ->", url);

  try {
    const res = await fetch(url, { headers: { Origin: origin } });
    console.log("baca publik:", res.status, "| teks:", (await res.text()).trim());
    console.log("CORS allow-origin:", res.headers.get("access-control-allow-origin") ?? "(tidak ada: kanvas editor tidak bisa memuat gambar)");

    const dl = await ambilGambar(tidakDipakai, url);
    console.log("unduh via S3:", dl ? `${dl.data.length} byte` : "gagal");
  } finally {
    await hapusGambar(tidakDipakai, url);
    const setelah = await fetch(url);
    console.log("setelah dihapus:", setelah.status, "(404 = terhapus)");
  }
}

main().catch((e) => {
  console.error("GAGAL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
