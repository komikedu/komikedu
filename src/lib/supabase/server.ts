import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/** Klien dengan sesi pengguna (tunduk pada RLS). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(list) {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // dipanggil dari Server Component: sesi disegarkan oleh middleware
          }
        },
      },
    },
  );
}

/**
 * Pengguna untuk halaman yang dijaga middleware (/dashboard dan /comics/**). Middleware sudah mengesahkan token ke server Auth
 * pada permintaan yang sama dan meneruskan cookie yang disegarkan, jadi di sini cukup membaca token dari cookie tanpa panggilan
 * jaringan kedua (ratusan milidetik di setiap halaman). JANGAN dipakai di rute yang tidak dijaga middleware, mis. /api/**:
 * di sana tetap pakai `supabase.auth.getUser()`. Basis data tetap menegakkan hak akses lewat RLS dengan token yang sama.
 */
export async function penggunaTerlindungi(supabase: Awaited<ReturnType<typeof createClient>>): Promise<{ id: string; email: string | null } | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as { sub?: unknown; email?: unknown };
    return typeof payload.sub === "string" && payload.sub ? { id: payload.sub, email: typeof payload.email === "string" ? payload.email : null } : null;
  } catch {
    return null;
  }
}

/** Klien service role: melewati RLS. Hanya untuk server (kredit, webhook, job). */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
