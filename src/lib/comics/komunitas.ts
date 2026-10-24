import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UkuranHalaman } from "@/lib/editor/types";
import type { BahasaId, FilterKomunitas, TemaId } from "./klasifikasi";
import { ukuranDariBaris } from "@/lib/editor/ukuran-halaman";
import { adaBerkas, bersihkanRilis, hapusGambar, kunciKomik, urlGambar } from "@/lib/storage/gambar";
import { kunciHalamanRilis } from "./salinan-publik";
import {
  LaporSchema,
  PER_HALAMAN_KOMUNITAS,
  PerbaruiDeskripsiSchema,
  TerbitSchema,
  adaGambarUntukTerbit,
  type AlasanLaporan,
} from "./komunitas-schema";

export type KomunitasResult<T = object> = ({ ok: true } & T) | { ok: false; error: string; status: number };

export type KomikPublik = {
  id: string;
  judul: string;
  jenjang: number;
  deskripsi: string;
  diterbitkan: string;
  penulis: string;
};

/** Komik di halaman baca: ditambah ukuran kanvas halaman (rasio gambar halaman salinan). */
export type KomikBaca = KomikPublik & { ukuran: UkuranHalaman };

/** Kartu di daftar komunitas: sampul = gambar halaman pertama dari salinan terbit. */
export type KartuKomunitas = KomikPublik & { sampul: string | null };

/**
 * Semua pembacaan data publik memakai klien admin dengan daftar kolom yang ditulis eksplisit di sini, bukan
 * `select *`: cerita, naskah mentah, dan materi guru tidak boleh ikut keluar. Hanya komik yang is_public dan
 * berstatus terbit yang pernah dikembalikan, dan yang dibaca publik hanya salinan tetap (`halaman_publik`),
 * bukan isi editor.
 */
// users(nama): nama penulis ikut diambil dalam satu permintaan (relasi comics.user_id -> users); satu permintaan ke Supabase
// memakan ratusan milidetik, jadi query kedua untuk nama penulis terasa sebagai jeda di halaman
const KOLOM_PUBLIK = "id, judul, jenjang, deskripsi_publik, diterbitkan_at, user_id, halaman_publik, lebar_halaman, tinggi_halaman, users(nama)";

type BarisKomik = {
  id: string;
  judul: string;
  jenjang: number;
  deskripsi_publik: string | null;
  diterbitkan_at: string | null;
  user_id: string;
  halaman_publik: string[] | null;
  lebar_halaman?: number | null;
  tinggi_halaman?: number | null;
  /** hasil embed relasi; objek tunggal (to-one), bisa null bila baris pengguna tidak ada */
  users?: { nama: string | null } | { nama: string | null }[] | null;
};

const namaDari = (r: BarisKomik): string => {
  const u = Array.isArray(r.users) ? r.users[0] : r.users;
  return (u?.nama ?? "").trim();
};

const keKomik = (r: BarisKomik): KomikPublik => ({
  id: r.id,
  judul: r.judul,
  jenjang: r.jenjang,
  deskripsi: r.deskripsi_publik ?? "",
  diterbitkan: r.diterbitkan_at ?? "",
  penulis: namaDari(r) || "Guru KomikEdu",
});

/** Hanya URL milik komik ini yang dianggap halaman salinan (kolom ini ditulis server, tetapi tetap diperiksa). */
const halamanSah = (r: Pick<BarisKomik, "id" | "user_id" | "halaman_publik">): string[] =>
  (Array.isArray(r.halaman_publik) ? r.halaman_publik : []).filter((u): u is string => typeof u === "string" && !!kunciKomik(u, r.user_id, r.id));

/** Komik terbit, terbaru dulu. `adaLagi` bila masih ada halaman berikutnya. */
export async function daftarTerbit(admin: SupabaseClient, halaman: number, filter: FilterKomunitas = {}): Promise<KomunitasResult<{ komik: KartuKomunitas[]; adaLagi: boolean }>> {
  const dari = (halaman - 1) * PER_HALAMAN_KOMUNITAS;
  let q = admin.from("comics").select(KOLOM_PUBLIK).eq("is_public", true).eq("status", "terbit").not("halaman_publik", "is", null);
  if (filter.jenjang !== undefined) q = q.eq("jenjang", filter.jenjang);
  if (filter.tema) q = q.eq("tema", filter.tema);
  if (filter.bahasa) q = q.eq("bahasa", filter.bahasa);
  const { data, error } = await q.order("diterbitkan_at", { ascending: false }).range(dari, dari + PER_HALAMAN_KOMUNITAS); // satu baris lebih untuk mengetahui apakah masih ada halaman berikutnya
  if (error) return { ok: false, error: "Gagal memuat komunitas", status: 500 };
  const baris = (data ?? []) as unknown as BarisKomik[];
  const adaLagi = baris.length > PER_HALAMAN_KOMUNITAS;
  const tampil = baris.slice(0, PER_HALAMAN_KOMUNITAS);
  return { ok: true, adaLagi, komik: tampil.map((r) => ({ ...keKomik(r), sampul: halamanSah(r)[0] ?? null })) };
}

/** Satu komik terbit beserta URL gambar halamannya (salinan tetap). null bila tidak ada, sudah ditarik, atau tanpa salinan. */
export async function bacaKomikPublik(admin: SupabaseClient, id: string): Promise<{ komik: KomikBaca; halaman: string[] } | null> {
  const { data } = await admin.from("comics").select(KOLOM_PUBLIK).eq("id", id).eq("is_public", true).eq("status", "terbit").maybeSingle();
  if (!data) return null;
  const baris = data as unknown as BarisKomik;
  const halaman = halamanSah(baris);
  if (!halaman.length) return null;
  return { komik: { ...keKomik(baris), ukuran: ukuranDariBaris(baris) }, halaman };
}

/** Status terbit komik milik pengguna (untuk dialog Terbitkan di editor). */
export type StatusTerbit = { terbit: boolean; deskripsi: string; tema?: TemaId | null; bahasa?: BahasaId };

/**
 * Terbitkan komik milik pengguna dari salinan halaman yang baru diunggah (`rilis`). `supabase` = klien pengguna (cek
 * kepemilikan lewat RLS), `admin` = service role (status, is_public, dan halaman_publik tidak boleh ditulis klien).
 * Pernyataan hak cipta wajib dicentang. Semua halaman harus sudah ada di penyimpanan sebelum komik dianggap terbit.
 */
export async function terbitkanKomik(supabase: SupabaseClient, admin: SupabaseClient, userId: string, comicId: string, input: unknown): Promise<KomunitasResult<StatusTerbit>> {
  const parsed = TerbitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Isian tidak valid", status: 400 };
  const { deskripsi, rilis, jumlah, tema, bahasa } = parsed.data;
  const { data: komik } = await supabase.from("comics").select("id, user_id, diterbitkan_at, halaman_publik").eq("id", comicId).maybeSingle();
  if (!komik || komik.user_id !== userId) return { ok: false, error: "Komik tidak ditemukan", status: 404 };

  const { data: panels } = await admin.from("panels").select("image_url, tampil, pages!inner(comic_id)").eq("pages.comic_id", comicId);
  if (!adaGambarUntukTerbit((panels ?? []) as { image_url: string | null; tampil: boolean | null }[])) {
    return { ok: false, error: "Buat gambar minimal satu halaman dulu sebelum menerbitkan komik.", status: 400 };
  }

  const kunci = Array.from({ length: jumlah }, (_, i) => kunciHalamanRilis(userId, comicId, rilis, i + 1));
  const ada = await Promise.all(kunci.map((k) => adaBerkas(admin, k).catch(() => false)));
  if (ada.some((a) => !a)) return { ok: false, error: "Sebagian halaman belum terunggah. Coba terbitkan lagi.", status: 400 };

  const lama = Array.isArray(komik.halaman_publik) ? (komik.halaman_publik as string[]) : [];
  const { error } = await admin
    .from("comics")
    .update({
      status: "terbit",
      is_public: true,
      deskripsi_publik: deskripsi || null,
      tema,
      bahasa,
      halaman_publik: kunci.map((k) => urlGambar(admin, k)),
      diterbitkan_at: komik.diterbitkan_at ?? new Date().toISOString(),
    })
    .eq("id", comicId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: "Gagal menerbitkan komik", status: 500 };

  // salinan lama (dan sisa unggahan yang tidak jadi diterbitkan) dibuang setelah yang baru dipakai
  await bersihkanRilis(admin, userId, comicId, new Set(kunci));
  for (const u of lama) if (kunciKomik(u, userId, comicId)?.includes("/rilis-") === false) await hapusGambar(admin, u);
  return { ok: true, terbit: true, deskripsi, tema, bahasa };
}

/** Ubah deskripsi, tema, dan bahasa komik yang sudah terbit. */
export async function perbaruiDeskripsi(admin: SupabaseClient, userId: string, comicId: string, input: unknown): Promise<KomunitasResult<StatusTerbit>> {
  const parsed = PerbaruiDeskripsiSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Isian tidak valid", status: 400 };
  const { data, error } = await admin
    .from("comics")
    .update({
      deskripsi_publik: parsed.data.deskripsi || null,
      ...(parsed.data.tema ? { tema: parsed.data.tema } : {}),
      ...(parsed.data.bahasa ? { bahasa: parsed.data.bahasa } : {}),
    })
    .eq("id", comicId)
    .eq("user_id", userId)
    .eq("is_public", true)
    .select("id, tema, bahasa");
  if (error || !data?.length) return { ok: false, error: "Komik belum terbit atau tidak ditemukan", status: 404 };
  return { ok: true, terbit: true, deskripsi: parsed.data.deskripsi, tema: (data[0].tema as TemaId | null) ?? null, bahasa: data[0].bahasa as BahasaId };
}

/**
 * Tarik komik dari komunitas: tidak lagi terlihat publik dan salinan gambarnya dihapus (alamat gambar publik tetap
 * bisa dibuka siapa pun yang tahu URL-nya, jadi harus benar-benar dihapus). Komik tetap utuh di akun pemiliknya
 * dan bisa diterbitkan lagi, yang membuat salinan baru.
 */
export async function tarikKomik(admin: SupabaseClient, userId: string, comicId: string): Promise<KomunitasResult<StatusTerbit>> {
  const { data, error } = await admin
    .from("comics")
    .update({ is_public: false, status: "draft", halaman_publik: null })
    .eq("id", comicId)
    .eq("user_id", userId)
    .select("id, deskripsi_publik");
  if (error || !data?.length) return { ok: false, error: "Komik tidak ditemukan", status: 404 };
  await bersihkanRilis(admin, userId, comicId, new Set());
  return { ok: true, terbit: false, deskripsi: (data[0].deskripsi_publik as string | null) ?? "" };
}

/** Laporkan komik terbit. Satu laporan per pelapor per komik; melapor lagi memperbarui alasannya. */
export async function laporkanKomik(admin: SupabaseClient, pelaporId: string, comicId: string, input: unknown): Promise<KomunitasResult> {
  const parsed = LaporSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Isian tidak valid", status: 400 };
  const { data: komik } = await admin.from("comics").select("id").eq("id", comicId).eq("is_public", true).eq("status", "terbit").maybeSingle();
  if (!komik) return { ok: false, error: "Komik tidak ditemukan atau sudah ditarik", status: 404 };
  const { error } = await admin
    .from("comic_reports")
    .upsert({ comic_id: comicId, pelapor_id: pelaporId, alasan: parsed.data.alasan, catatan: parsed.data.catatan, status: "baru" }, { onConflict: "comic_id,pelapor_id" });
  if (error) return { ok: false, error: "Gagal mengirim laporan", status: 500 };
  return { ok: true };
}

export type RingkasanLaporan = { comicId: string; judul: string; terbit: boolean; jumlah: number; alasan: Record<AlasanLaporan, number>; catatan: string[]; terakhir: string };

/** Ringkas daftar laporan baru per komik (untuk halaman admin). Komik dengan laporan terbanyak lebih dulu. */
export function ringkasLaporan(
  rows: { comic_id: string; alasan: AlasanLaporan; catatan: string | null; created_at: string; comics: { judul: string; is_public: boolean } | null }[],
): RingkasanLaporan[] {
  const peta = new Map<string, RingkasanLaporan>();
  for (const r of rows) {
    const item =
      peta.get(r.comic_id) ??
      ({ comicId: r.comic_id, judul: r.comics?.judul ?? "(komik dihapus)", terbit: !!r.comics?.is_public, jumlah: 0, alasan: { "tidak-pantas": 0, "hak-cipta": 0, salah: 0, spam: 0, lainnya: 0 }, catatan: [], terakhir: r.created_at } satisfies RingkasanLaporan);
    item.jumlah += 1;
    item.alasan[r.alasan] += 1;
    if (r.catatan && item.catatan.length < 3) item.catatan.push(r.catatan);
    if (r.created_at > item.terakhir) item.terakhir = r.created_at;
    peta.set(r.comic_id, item);
  }
  return [...peta.values()].sort((a, b) => b.jumlah - a.jumlah || b.terakhir.localeCompare(a.terakhir));
}

/** Laporan berstatus baru, diringkas per komik. */
export async function daftarLaporan(admin: SupabaseClient): Promise<RingkasanLaporan[]> {
  const { data } = await admin
    .from("comic_reports")
    .select("comic_id, alasan, catatan, created_at, comics(judul, is_public)")
    .eq("status", "baru")
    .order("created_at", { ascending: false })
    .limit(500);
  return ringkasLaporan((data ?? []) as unknown as Parameters<typeof ringkasLaporan>[0]);
}

/** Admin menarik komik siapa pun yang dilaporkan (salinan publiknya dihapus), dan menandai laporannya selesai. */
export async function tarikOlehAdmin(admin: SupabaseClient, comicId: string): Promise<boolean> {
  const { data, error } = await admin.from("comics").update({ is_public: false, status: "draft", halaman_publik: null }).eq("id", comicId).select("user_id");
  if (error || !data?.length) return false;
  await bersihkanRilis(admin, data[0].user_id as string, comicId, new Set());
  await admin.from("comic_reports").update({ status: "selesai" }).eq("comic_id", comicId);
  return true;
}

/** Admin menutup laporan tanpa menarik komik (laporan dinilai tidak beralasan). */
export async function tutupLaporan(admin: SupabaseClient, comicId: string): Promise<boolean> {
  const { error } = await admin.from("comic_reports").update({ status: "selesai" }).eq("comic_id", comicId);
  return !error;
}
