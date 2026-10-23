/**
 * Kunci pembuatan gambar per panel (status "generating" + waktu mulai). Satu pembuatan gambar berjalan paling lama
 * sekitar 2 menit, jadi kunci yang lebih tua dari ini dianggap basi (server berhenti di tengah proses) dan boleh diambil alih.
 */
export const KUNCI_BASI_MS = 5 * 60 * 1000;

/** Nilai yang ditulis saat mengambil kunci. */
export const ambilKunci = (sekarang = new Date()) => ({ status: "generating", generating_sejak: sekarang.toISOString() });

/**
 * Filter PostgREST (`.or(...)`) untuk panel yang kuncinya boleh diambil: tidak sedang dibuat, atau sedang dibuat tetapi
 * tanpa waktu mulai (sisa kunci lama) atau sudah basi.
 */
export function syaratKunciBebas(sekarang = new Date()): string {
  const batas = new Date(sekarang.getTime() - KUNCI_BASI_MS).toISOString();
  return `status.neq.generating,generating_sejak.is.null,generating_sejak.lt.${batas}`;
}
