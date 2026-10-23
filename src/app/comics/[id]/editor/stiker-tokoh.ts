import { useEditor } from "@/lib/editor/store";
import { hapusLatar } from "./hapus-latar";

/**
 * Jadikan gambar sebuah tokoh stiker bebas di halaman yang sedang dibuka: latarnya dihapus di peramban (MODNet), hasilnya
 * disimpan ke folder komik, lalu ditaruh sebagai stiker. Mengembalikan pesan galat, atau null bila berhasil.
 */
export async function jadikanStikerTokoh(comicId: string, url: string): Promise<string | null> {
  try {
    const file = await hapusLatar(url);
    const bmp = await createImageBitmap(file);
    const rasio = bmp.width / bmp.height;
    bmp.close();
    const form = new FormData();
    form.set("file", file);
    const res = await fetch(`/api/comics/${comicId}/stiker`, { method: "PUT", body: form });
    const json = (await res.json().catch(() => null)) as { ok: true; url: string } | { ok: false; error: string } | null;
    if (!res.ok || !json?.ok) return json && !json.ok ? json.error : "Gagal menyimpan stiker. Coba lagi.";
    useEditor.getState().addStiker(json.url, rasio);
    return null;
  } catch {
    return "Gagal menghapus latar. Periksa koneksi lalu coba lagi.";
  }
}
