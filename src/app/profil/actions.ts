"use server";

import { revalidatePath } from "next/cache";
import { ProfilSchema } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";

export type HasilProfil = { ok: true } | { ok: false; error: string };

/**
 * Simpan profil pengguna yang sedang masuk (nama, peran, sekolah). Hanya baris milik sendiri yang diubah: kolom lain
 * (saldo kredit dan sebagainya) tidak bisa ditulis dari klien, dan RLS membatasi ke pemilik.
 */
export async function simpanProfil(input: { nama: string; peran: string | null; sekolah: string | null }): Promise<HasilProfil> {
  const parsed = ProfilSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Isian tidak valid" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesi berakhir, silakan login lagi" };

  const { data, error } = await supabase.from("users").update(parsed.data).eq("id", user.id).select("id");
  if (error) return { ok: false, error: "Gagal menyimpan profil. Coba lagi." };
  if (!data?.length) return { ok: false, error: "Profil tidak ditemukan" };

  revalidatePath("/", "layout");
  return { ok: true };
}
