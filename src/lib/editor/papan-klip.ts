import { seleksiAktif, useEditor, type IsiPapanKlip } from "./store";

/**
 * Salin, potong, dan tempel objek di atas halaman (teks bergaya, stiker, kumpulan benda, dan balon) di dalam editor,
 * termasuk antar halaman. Papan klip ini hanya ada di memori peramban (tidak memakai papan klip sistem).
 */
let isi: IsiPapanKlip | null = null;
let halamanAsal = "";
/** Berapa kali sudah ditempel di tiap halaman sejak disalin; menentukan seberapa jauh tempel berikutnya digeser. */
let tempelDi: Record<string, number> = {};

export const adaPapanKlip = () => !!isi;

/** Salin objek yang sedang dipilih; false bila tidak ada yang bisa disalin (mis. yang dipilih panel). */
export function salin(): boolean {
  const st = useEditor.getState();
  const page = st.pages.find((p) => p.id === st.activePageId);
  if (!page || !st.selectedId) return false;
  const idBalon = seleksiAktif(st.seleksi, st.selectedId);
  const balon = page.bubbles.filter((b) => (idBalon.length ? idBalon.includes(b.id) : b.id === st.selectedId));
  const elemen = page.elements.filter((e) => e.id === st.selectedId);
  if (!balon.length && !elemen.length) return false;
  isi = JSON.parse(JSON.stringify({ elemen, balon })) as IsiPapanKlip;
  halamanAsal = page.id;
  tempelDi = { [page.id]: 1 }; // di halaman asal, tempel pertama sudah digeser satu langkah
  // timpa papan klip sistem (mis. tangkapan layar lama) supaya Ctrl+V berikutnya dikenali sebagai tempel objek, bukan tempel gambar
  try {
    void navigator.clipboard?.writeText("komikedu-objek").catch(() => undefined);
  } catch {
    // izin papan klip ditolak: tempel tetap jalan bila tidak ada panel terpilih
  }
  return true;
}

/** Salin lalu hapus yang dipilih. */
export function potong(): boolean {
  if (!salin()) return false;
  const st = useEditor.getState();
  const idBalon = seleksiAktif(st.seleksi, st.selectedId);
  if (idBalon.length) st.deleteBalonBanyak(idBalon);
  else if (isi?.elemen.length) st.deleteElement(st.selectedId!);
  else st.deleteBubble(st.selectedId!);
  // setelah dipotong, tempel pertama di halaman yang sama kembali ke posisi semula
  tempelDi[halamanAsal] = 0;
  return true;
}

/** Tempel ke halaman aktif. Tiap tempel di halaman yang sama digeser sedikit supaya tidak menumpuk; tempel pertama di halaman lain menempati posisi yang sama. */
export function tempel(): boolean {
  if (!isi) return false;
  const st = useEditor.getState();
  const ke = tempelDi[st.activePageId] ?? 0;
  tempelDi[st.activePageId] = ke + 1;
  st.tempelData(JSON.parse(JSON.stringify(isi)) as IsiPapanKlip, ke * 24);
  return true;
}
