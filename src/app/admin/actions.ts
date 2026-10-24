"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { TAG_KOMUNITAS } from "@/lib/comics/komunitas-cache";
import { bacaTambahKredit, isAdminEmail } from "@/lib/admin";
import { tambahKredit } from "@/lib/admin-kredit";
import { tarikOlehAdmin, tutupLaporan } from "@/lib/comics/komunitas";
import { isImageProviderName, setImageProviderName } from "@/lib/settings";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function simpanProvider(form: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) throw new Error("Tidak diizinkan");
  const nilai = form.get("provider");
  if (!isImageProviderName(nilai)) throw new Error("Provider tidak dikenal");
  await setImageProviderName(nilai, user.id);
  revalidatePath("/admin");
}

export type HasilKredit = { ok: boolean; pesan: string } | null;

/** Tambah kredit ke satu pengguna. Hanya admin; dicatat di credit_ledger beserta email admin dan catatannya. */
export async function tambahKreditPengguna(_sebelumnya: HasilKredit, form: FormData): Promise<HasilKredit> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return { ok: false, pesan: "Tidak diizinkan" };

  const isian = bacaTambahKredit({ userId: form.get("userId"), jumlah: form.get("jumlah"), catatan: form.get("catatan") });
  if (!isian.ok) return { ok: false, pesan: isian.error };

  const alasan = `admin ${user.email}: ${isian.catatan || "tambah kredit"}`;
  const res = await tambahKredit(createAdminClient(), isian.userId, isian.jumlah, alasan);
  if (!res.ok) return { ok: false, pesan: res.error };
  revalidatePath("/admin");
  return { ok: true, pesan: `${isian.jumlah} kredit ditambahkan${res.nama ? ` ke ${res.nama}` : ""}. Saldo sekarang ${res.saldo}.` };
}

async function pastikanAdmin(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) throw new Error("Tidak diizinkan");
}

/** Admin menarik komik yang dilaporkan dari komunitas dan menutup laporannya. Komik tetap ada di akun pemiliknya. */
export async function tarikKomikDilaporkan(form: FormData): Promise<void> {
  await pastikanAdmin();
  const id = form.get("comicId");
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Komik tidak valid");
  if (!(await tarikOlehAdmin(createAdminClient(), id))) throw new Error("Gagal menarik komik");
  revalidatePath("/admin");
  revalidatePath("/komunitas");
  revalidateTag(TAG_KOMUNITAS);
  revalidatePath(`/baca/${id}`);
}

/** Admin menutup laporan tanpa menarik komik (laporan dinilai tidak beralasan). */
export async function tutupLaporanKomik(form: FormData): Promise<void> {
  await pastikanAdmin();
  const id = form.get("comicId");
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Komik tidak valid");
  if (!(await tutupLaporan(createAdminClient(), id))) throw new Error("Gagal menutup laporan");
  revalidatePath("/admin");
}
