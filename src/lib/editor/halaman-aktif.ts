/**
 * Ingat halaman yang sedang dibuka per komik di peramban, supaya muat ulang (refresh) kembali ke halaman itu, bukan halaman 1.
 * Hanya kenyamanan: bila penyimpanan peramban tidak tersedia atau id sudah tidak ada, editor membuka halaman pertama.
 */
const kunci = (comicId: string) => `komikedu:halaman-aktif:${comicId}`;

/** Id halaman terakhir yang dibuka, bila masih ada di `idHalaman`; kalau tidak, null. */
export function bacaHalamanAktif(comicId: string, idHalaman: string[]): string | null {
  try {
    const id = window.localStorage.getItem(kunci(comicId));
    return id && idHalaman.includes(id) ? id : null;
  } catch {
    return null;
  }
}

export function simpanHalamanAktif(comicId: string, idHalaman: string): void {
  try {
    window.localStorage.setItem(kunci(comicId), idHalaman);
  } catch {
    // penyimpanan peramban diblokir atau penuh: tidak apa-apa
  }
}
