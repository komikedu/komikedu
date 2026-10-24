import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import type { FilterKomunitas } from "./klasifikasi";
import { bacaKomikPublik, daftarTerbit } from "./komunitas";

/**
 * Data publik komunitas disimpan sementara di server. Setiap permintaan ke Supabase memakan ratusan milidetik, dan galeri
 * serta halaman baca sama untuk semua orang, jadi hampir semua kunjungan dilayani dari simpanan. Terbit, ubah, dan tarik
 * komik memanggil `revalidateTag(TAG_KOMUNITAS)` sehingga perubahan langsung terlihat; sisanya paling lama 60 detik.
 */
export const TAG_KOMUNITAS = "komunitas";
const DETIK = 60;

type Daftar = Awaited<ReturnType<typeof daftarTerbit>>;

const daftarTersimpan = unstable_cache(
  async (halaman: number, jenjang: number | null, tema: string | null, bahasa: string | null) => {
    const hasil = await daftarTerbit(createAdminClient(), halaman, {
      ...(jenjang !== null ? { jenjang } : {}),
      ...(tema ? { tema: tema as FilterKomunitas["tema"] } : {}),
      ...(bahasa ? { bahasa: bahasa as FilterKomunitas["bahasa"] } : {}),
    });
    // hasil gagal tidak boleh ikut tersimpan: dilempar agar tidak masuk simpanan, lalu ditangkap di bawah
    if (!hasil.ok) throw new Error(hasil.error);
    return hasil;
  },
  ["komunitas-daftar"],
  { revalidate: DETIK, tags: [TAG_KOMUNITAS] },
);

/** Galeri komunitas (halaman dan filter tertentu) dari simpanan, atau dari database bila simpanan kosong atau kedaluwarsa. */
export async function daftarTerbitTersimpan(halaman: number, filter: FilterKomunitas = {}): Promise<Daftar> {
  try {
    return await daftarTersimpan(halaman, filter.jenjang ?? null, filter.tema ?? null, filter.bahasa ?? null);
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message ? e.message : "Gagal memuat komunitas", status: 500 };
  }
}

const bacaTersimpan = unstable_cache(async (id: string) => bacaKomikPublik(createAdminClient(), id), ["komunitas-baca"], { revalidate: DETIK, tags: [TAG_KOMUNITAS] });

/** Satu komik terbit untuk halaman baca dan metadata, dari simpanan; null bila tidak ada atau sudah ditarik. */
export const bacaKomikPublikTersimpan = (id: string) => bacaTersimpan(id);
