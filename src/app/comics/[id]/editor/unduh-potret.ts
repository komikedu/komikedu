/** Nama berkas aman dari nama tokoh, mis. "Bu Rina" -> "Bu-Rina". */
export const namaBerkasAcuan = (nama: string) => `${nama.trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "tokoh"}.png`;

/**
 * Unduh gambar potret tokoh sebagai PNG (Google Flow lebih pasti menerima PNG/JPG daripada WebP).
 * Bila konversi gagal, berkas asli diunduh. Mengembalikan false bila gambar tidak bisa diambil.
 */
export async function unduhPotret(url: string, namaBerkas: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    let blob = await res.blob();
    let nama = namaBerkas;
    try {
      const bmp = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      canvas.getContext("2d")?.drawImage(bmp, 0, 0);
      bmp.close();
      const png = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
      if (png) blob = png;
      else nama = nama.replace(/\.png$/, ".webp");
    } catch {
      nama = nama.replace(/\.png$/, ".webp");
    }
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = nama;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
    return true;
  } catch {
    return false;
  }
}
