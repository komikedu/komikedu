import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/comics"];

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { pathname } = request.nextUrl;
  const dilindungi = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!dilindungi) {
    // Rute publik tidak butuh pengesahan ke server Auth (satu panggilan ke Supabase memakan ratusan milidetik di setiap
    // perpindahan halaman). getSession hanya membaca cookie dan menyegarkan token yang sudah kedaluwarsa, supaya sesi
    // tetap hidup; tidak ada keputusan akses yang bergantung padanya.
    await supabase.auth.getSession();
    return response;
  }

  // getUser memvalidasi token ke server Auth (bukan sekadar membaca cookie): dipakai untuk rute yang dilindungi
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(login);
  }
  return response;
}
