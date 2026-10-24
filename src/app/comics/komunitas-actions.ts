"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { laporkanKomik, perbaruiDeskripsi, tarikKomik, terbitkanKomik, type StatusTerbit } from "@/lib/comics/komunitas";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export type AksiHasil<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const IdSchema = z.string().uuid();

async function pengguna() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

const hasil = <T extends object>(r: ({ ok: true } & T) | { ok: false; error: string; status: number }): AksiHasil<T> => (r.ok ? r : { ok: false, error: r.error });

/**
 * Terbitkan komik ke komunitas dari salinan halaman yang baru diunggah (`rilis`, `jumlah` halaman). `setuju` (pernyataan
 * hak cipta) wajib true.
 */
export async function terbitkanAksi(comicId: string, input: { deskripsi: string; setuju: boolean; rilis: string; jumlah: number; tema?: string; bahasa?: string }): Promise<AksiHasil<StatusTerbit>> {
  if (!IdSchema.safeParse(comicId).success) return { ok: false, error: "Komik tidak ditemukan" };
  const p = await pengguna();
  if (!p) return { ok: false, error: "Sesi berakhir, silakan masuk lagi" };
  const res = await terbitkanKomik(p.supabase, createAdminClient(), p.user.id, comicId, input);
  if (res.ok) {
    revalidatePath("/komunitas");
    revalidatePath(`/baca/${comicId}`);
    revalidatePath("/dashboard");
  }
  return hasil(res);
}

export async function perbaruiDeskripsiAksi(comicId: string, deskripsi: string, tema?: string, bahasa?: string): Promise<AksiHasil<StatusTerbit>> {
  if (!IdSchema.safeParse(comicId).success) return { ok: false, error: "Komik tidak ditemukan" };
  const p = await pengguna();
  if (!p) return { ok: false, error: "Sesi berakhir, silakan masuk lagi" };
  const res = await perbaruiDeskripsi(createAdminClient(), p.user.id, comicId, { deskripsi, tema, bahasa });
  if (res.ok) {
    revalidatePath("/komunitas");
    revalidatePath(`/baca/${comicId}`);
  }
  return hasil(res);
}

/** Tarik komik dari komunitas. Komik tetap utuh di akun pemiliknya dan bisa diterbitkan lagi. */
export async function tarikAksi(comicId: string): Promise<AksiHasil<StatusTerbit>> {
  if (!IdSchema.safeParse(comicId).success) return { ok: false, error: "Komik tidak ditemukan" };
  const p = await pengguna();
  if (!p) return { ok: false, error: "Sesi berakhir, silakan masuk lagi" };
  const res = await tarikKomik(createAdminClient(), p.user.id, comicId);
  if (res.ok) {
    revalidatePath("/komunitas");
    revalidatePath(`/baca/${comicId}`);
    revalidatePath("/dashboard");
  }
  return hasil(res);
}

/** Laporkan komik terbit. Harus masuk dulu agar laporan tidak mudah disalahgunakan. */
export async function laporkanAksi(comicId: string, input: { alasan: string; catatan: string }): Promise<AksiHasil> {
  if (!IdSchema.safeParse(comicId).success) return { ok: false, error: "Komik tidak ditemukan" };
  const p = await pengguna();
  if (!p) return { ok: false, error: "Masuk dulu untuk melaporkan komik." };
  return hasil(await laporkanKomik(createAdminClient(), p.user.id, comicId, input));
}
