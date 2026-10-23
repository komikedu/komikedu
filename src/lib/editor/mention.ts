/**
 * Sebut tokoh dengan "@" di kolom adegan: ketik "@Jo" lalu pilih "Joko". Yang disisipkan nama polos
 * (tanpa "@") agar adegan tetap kalimat biasa dan cocok dengan nama di daftar tokoh.
 */

/** "@kata" tepat sebelum kursor: posisi "@" dan teks setelahnya. null bila kursor tidak sedang menyebut tokoh. */
export function cariMention(teks: string, kursor: number): { awal: number; query: string } | null {
  const sebelum = teks.slice(0, kursor);
  const m = /(?:^|[^\p{L}\d])@([\p{L}\d]*(?: [\p{L}\d]*)?)$/u.exec(sebelum);
  if (!m) return null;
  return { awal: kursor - m[1].length - 1, query: m[1] };
}

/** Nama tokoh yang cocok dengan query (awalan kata, tanpa peduli huruf besar-kecil). */
export function saringNama(nama: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  return nama.filter((n) => !q || n.toLowerCase().split(/\s+/).some((k) => k.startsWith(q)) || n.toLowerCase().startsWith(q));
}

/** Ganti "@query" dengan nama tokoh dan spasi; kembalikan teks baru dan posisi kursor. */
export function sisipkanMention(teks: string, awal: number, kursor: number, nama: string): { teks: string; kursor: number } {
  const setelah = teks.slice(kursor);
  const sisip = setelah.startsWith(" ") ? nama : `${nama} `;
  return { teks: teks.slice(0, awal) + sisip + setelah, kursor: awal + sisip.length };
}
