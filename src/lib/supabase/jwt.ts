/**
 * Verifikasi token akses Supabase (JWT HS256) secara lokal dengan rahasia JWT proyek, tanpa panggilan jaringan ke server Auth.
 * Hanya memakai Web Crypto, jadi jalan di middleware (Edge). Menjamin tanda tangan sah dan token belum kedaluwarsa, sama
 * dengan jaminan PostgREST terhadap token yang sama; yang tidak terdeteksi hanyalah sesi yang dicabut sebelum token habis (maks. 1 jam).
 */

const dec = new TextDecoder();
const enc = new TextEncoder();

function dariBase64Url(s: string): Uint8Array<ArrayBuffer> {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b + "=".repeat((4 - (b.length % 4)) % 4));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export type KlaimToken = { sub: string; email: string | null; exp: number };

/** Klaim token bila tanda tangannya sah, belum kedaluwarsa, dan milik pengguna terautentikasi; selain itu null. */
export async function verifikasiTokenHS256(token: string, rahasia: string, sekarangDetik = Date.now() / 1000): Promise<KlaimToken | null> {
  const bagian = token.split(".");
  if (bagian.length !== 3 || !rahasia) return null;
  try {
    const header = JSON.parse(dec.decode(dariBase64Url(bagian[0]))) as { alg?: string };
    if (header.alg !== "HS256") return null; // tolak "none" dan algoritma lain
    const kunci = await crypto.subtle.importKey("raw", enc.encode(rahasia), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sah = await crypto.subtle.verify("HMAC", kunci, dariBase64Url(bagian[2]), enc.encode(`${bagian[0]}.${bagian[1]}`));
    if (!sah) return null;
    const p = JSON.parse(dec.decode(dariBase64Url(bagian[1]))) as { sub?: unknown; email?: unknown; exp?: unknown; aud?: unknown; role?: unknown };
    if (typeof p.exp !== "number" || p.exp <= sekarangDetik) return null;
    if (p.role !== "authenticated" && p.aud !== "authenticated") return null; // bukan kunci anon atau service_role
    if (typeof p.sub !== "string" || !p.sub) return null;
    return { sub: p.sub, email: typeof p.email === "string" ? p.email : null, exp: p.exp };
  } catch {
    return null;
  }
}
