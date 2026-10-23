/** Aturan jumlah panel per halaman untuk prompt naskah. `n` kosong = otomatis (AI memilih sesuai isi halaman). */
export function aturanPanelPerHalaman(n: number | null | undefined): string {
  if (n && Number.isInteger(n) && n >= 1 && n <= 6) {
    return n === 1
      ? "- Setiap halaman berisi TEPAT 1 panel penuh (satu adegan besar per halaman)."
      : `- Setiap halaman berisi TEPAT ${n} panel, tidak lebih dan tidak kurang. Bagi cerita halaman itu menjadi ${n} adegan yang berurutan.`;
  }
  return "- Setiap halaman berisi 2 sampai 4 panel, sesuai banyaknya adegan di halaman itu.";
}
