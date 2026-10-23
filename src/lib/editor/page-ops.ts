import { createPage, newId } from "./factory";
import { MAX_PAGES } from "./persist";
import type { EditorPage } from "./types";

/**
 * Operasi halaman di editor. Mengubah daftar halaman di tempat (cocok dengan draft immer di store)
 * dan mengembalikan id halaman yang menjadi aktif berikutnya, atau null bila tidak ada perubahan.
 */

/** Sisipkan halaman kosong tepat setelah halaman `id`, dengan layout yang sama. */
export function insertPageAfter(pages: EditorPage[], id: string): string | null {
  const idx = pages.findIndex((p) => p.id === id);
  if (idx < 0 || pages.length >= MAX_PAGES) return null;
  const baru = createPage(pages[idx].layoutId);
  pages.splice(idx + 1, 0, baru);
  return baru.id;
}

/**
 * Duplikat halaman beserta panel, balon, dan elemennya (semua id baru) tepat setelah aslinya.
 * Gambar panel ikut: klien mencatat `salinanDari` agar server menyalin image_url saat menyimpan,
 * karena image_url tidak pernah ditulis dari klien.
 */
export function duplicatePage(pages: EditorPage[], id: string): string | null {
  const idx = pages.findIndex((p) => p.id === id);
  if (idx < 0 || pages.length >= MAX_PAGES) return null;
  const asal = pages[idx];
  const peta = new Map(asal.panels.map((p) => [p.id, newId()]));
  const salinan: EditorPage = {
    id: newId(),
    layoutId: asal.layoutId,
    panels: asal.panels.map((p) => ({
      ...p,
      id: peta.get(p.id)!,
      salinanDari: p.imageUrl ? p.id : undefined,
      corners: p.corners ? p.corners.map((c) => ({ ...c })) : p.corners,
      imageRect: p.imageRect ? { ...p.imageRect } : p.imageRect,
    })),
    bubbles: asal.bubbles.map((b) => ({ ...b, id: newId(), panelId: peta.get(b.panelId)!, tail: b.tail ? { ...b.tail } : null })),
    elements: asal.elements.map((e) => ({ ...e, id: newId(), panelId: peta.get(e.panelId)! })),
  };
  pages.splice(idx + 1, 0, salinan);
  return salinan.id;
}

/** Hapus halaman. Komik selalu menyisakan minimal satu halaman; halaman aktif berikutnya adalah tetangganya. */
export function deletePage(pages: EditorPage[], id: string): string | null {
  const idx = pages.findIndex((p) => p.id === id);
  if (idx < 0 || pages.length <= 1) return null;
  pages.splice(idx, 1);
  return pages[Math.min(idx, pages.length - 1)].id;
}
