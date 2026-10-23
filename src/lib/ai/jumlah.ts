/**
 * Deteksi adegan yang menuntut jumlah benda tertentu (mis. "10 apel", "sepuluh kelereng").
 * Model gambar AI tidak andal menggambar jumlah yang tepat, jadi jumlah pasti sebaiknya memakai
 * Elemen Mat "Kumpulan benda". Hanya peringatan; tidak memblokir persetujuan naskah.
 */

// frasa dua kata dicoba lebih dulu, kalau tidak "dua belas" terbaca "dua" + benda "belas"
const ANGKA = "(?:dua|tiga|empat|lima)\\s+belas|dua\\s+puluh|\\d{1,3}|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas";
const SATUAN = "buah|butir|biji|potong|ekor|lembar|batang|keping|kotak|bungkus|bola|ikat";

/** Kata setelah angka yang BUKAN benda yang digambar (kelas, waktu, ukuran, dll.). */
const BUKAN_BENDA = new Set([
  "kelas", "tahun", "bulan", "hari", "jam", "menit", "detik", "meter", "cm", "km", "kg", "gram", "liter",
  "halaman", "panel", "sd", "smp", "kali", "persen", "derajat", "langkah", "orang", "anak", "siswa", "sisi", "sudut",
  "pagi", "siang", "sore", "malam",
]);

const POLA = new RegExp(`(?:^|[^\\p{L}\\d])(${ANGKA})\\s+(?:(?:${SATUAN})\\s+)?(\\p{L}+)`, "giu");

/** Kembalikan frasa jumlah benda yang ditemukan di adegan, mis. ["10 apel"]. */
export function jumlahBendaDiAdegan(adegan: string): string[] {
  const hasil: string[] = [];
  for (const m of adegan.matchAll(POLA)) {
    const benda = m[2].toLowerCase();
    if (BUKAN_BENDA.has(benda)) continue;
    hasil.push(m[0].replace(/^[^\p{L}\d]/u, "").trim());
  }
  return hasil;
}
