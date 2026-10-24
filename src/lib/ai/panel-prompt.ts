/**
 * Aturan jumlah panel per halaman untuk prompt naskah. `n` kosong = otomatis (AI memilih sesuai isi halaman); `n` dan `maks` bersama = rentang.
 */
export function aturanPanelPerHalaman(n: number | null | undefined, maks?: number | null): string {
  const valid = (x: number | null | undefined): x is number => !!x && Number.isInteger(x) && x >= 1 && x <= 6;
  if (valid(n) && valid(maks) && maks > n) {
    return (
      `- Setiap halaman berisi antara ${n} dan ${maks} panel (boleh berbeda tiap halaman), sesuai banyaknya adegan di halaman itu. ` +
      "Variasikan jumlahnya: halaman penuh aksi memakai lebih banyak panel, adegan penting atau puncak cerita memakai lebih sedikit panel yang lebih besar."
    );
  }
  if (valid(n)) {
    return n === 1
      ? "- Setiap halaman berisi TEPAT 1 panel penuh (satu adegan besar per halaman)."
      : `- Setiap halaman berisi TEPAT ${n} panel, tidak lebih dan tidak kurang. Bagi cerita halaman itu menjadi ${n} adegan yang berurutan.`;
  }
  return "- Setiap halaman berisi 2 sampai 4 panel, sesuai banyaknya adegan di halaman itu.";
}
