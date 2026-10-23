import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PenggunaAdmin = { id: string; email: string; nama: string; saldo: number; bergabung: string };

const MAKS_PENGGUNA = 500;

/** Pengguna terbaru dengan email (dari auth), nama, dan saldo kredit. Email hanya ada di auth.users, jadi memakai API admin. */
export async function daftarPengguna(admin: SupabaseClient): Promise<PenggunaAdmin[]> {
  const { data: auth, error } = await admin.auth.admin.listUsers({ page: 1, perPage: MAKS_PENGGUNA });
  if (error) throw error;
  const users = auth.users;
  if (!users.length) return [];
  const { data: profil } = await admin.from("users").select("id, nama, saldo_kredit").in("id", users.map((u) => u.id));
  const peta = new Map((profil ?? []).map((p) => [p.id as string, p]));
  return users
    .map((u) => ({
      id: u.id,
      email: u.email ?? "(tanpa email)",
      nama: (peta.get(u.id)?.nama as string | null) ?? "",
      saldo: (peta.get(u.id)?.saldo_kredit as number | undefined) ?? 0,
      bergabung: u.created_at,
    }))
    .sort((a, b) => b.bergabung.localeCompare(a.bergabung));
}

/**
 * Tambah kredit ke pengguna dan catat di credit_ledger (alasan memuat email admin agar bisa diaudit).
 * Memakai fungsi refund_credits yang menambah saldo dan menulis ledger dalam satu transaksi.
 */
export async function tambahKredit(
  admin: SupabaseClient,
  userId: string,
  jumlah: number,
  alasan: string,
): Promise<{ ok: true; saldo: number; nama: string } | { ok: false; error: string }> {
  const { data: profil } = await admin.from("users").select("nama").eq("id", userId).maybeSingle();
  if (!profil) return { ok: false, error: "Pengguna tidak ditemukan" };
  const { error } = await admin.rpc("refund_credits", { p_user: userId, p_amount: jumlah, p_alasan: alasan, p_ref: null });
  if (error) return { ok: false, error: "Gagal menambah kredit" };
  const { data: baru } = await admin.from("users").select("saldo_kredit").eq("id", userId).single();
  return { ok: true, saldo: baru?.saldo_kredit ?? 0, nama: (profil.nama as string | null) ?? "" };
}
