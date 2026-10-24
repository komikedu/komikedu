import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { verifikasiTokenHS256 } from "./jwt";

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

  const keLogin = () => {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(login);
  };

  // Rute yang dilindungi. getSession membaca cookie (dan menyegarkan token yang sudah kedaluwarsa). Tanda tangan dan masa
  // berlaku token lalu diperiksa lokal dengan rahasia JWT proyek, tanpa panggilan ke server Auth: satu panggilan itu memakan
  // ratusan milidetik di setiap perpindahan halaman, termasuk prefetch tautan. Jaminannya sama dengan yang ditegakkan basis
  // data terhadap token yang sama. Tanpa rahasia (mis. pengembangan lokal) atau bila pemeriksaan gagal, jatuh ke getUser.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return keLogin();
  const rahasia = process.env.SUPABASE_JWT_SECRET;
  if (rahasia && (await verifikasiTokenHS256(session.access_token, rahasia))) return response;

  // getUser memvalidasi token ke server Auth (bukan sekadar membaca cookie)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? response : keLogin();
}
