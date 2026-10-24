/**
 * Catat setiap galat permintaan di server sebagai satu baris JSON yang mudah dicari di log hosting (cari "galat-permintaan").
 * `digest` sama dengan kode yang ditampilkan di halaman galat, jadi laporan pengguna bisa dicocokkan dengan barisnya.
 */
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
  context: { routePath: string; routeType: string; renderSource?: string },
) {
  const e = err as { message?: string; digest?: string; stack?: string };
  console.error(
    "galat-permintaan",
    JSON.stringify({
      digest: e?.digest ?? null,
      pesan: e?.message ?? String(err),
      jalur: request.path,
      metode: request.method,
      rute: context.routePath,
      jenis: context.routeType,
      sumber: context.renderSource ?? null,
      jejak: e?.stack?.split("\n").slice(0, 6).join(" | ") ?? null,
    }),
  );
}
