/** Admin ditentukan lewat env ADMIN_EMAILS (dipisah koma), tanpa kolom peran di database. */
export function isAdminEmail(email: string | null | undefined, daftar = process.env.ADMIN_EMAILS ?? ""): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  return daftar
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .some((s) => s && s === e);
}

export const MAX_TAMBAH_KREDIT = 1000;

/** Baca dan periksa isian form tambah kredit. Jumlah bulat 1 sampai MAX_TAMBAH_KREDIT; catatan opsional satu baris. */
export function bacaTambahKredit(input: { userId: unknown; jumlah: unknown; catatan: unknown }):
  | { ok: true; userId: string; jumlah: number; catatan: string }
  | { ok: false; error: string } {
  const userId = typeof input.userId === "string" ? input.userId : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return { ok: false, error: "Pilih pengguna dulu" };
  const jumlah = Number(input.jumlah);
  if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > MAX_TAMBAH_KREDIT) return { ok: false, error: `Jumlah harus bilangan bulat 1 sampai ${MAX_TAMBAH_KREDIT}` };
  const catatan = (typeof input.catatan === "string" ? input.catatan : "").replace(/\s+/g, " ").trim();
  if (catatan.length > 100) return { ok: false, error: "Catatan maksimal 100 karakter" };
  return { ok: true, userId, jumlah, catatan };
}
