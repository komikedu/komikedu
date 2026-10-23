const SISI_MAKS = 2048;

/**
 * Kecilkan gambar di peramban sebelum diunggah (sisi terpanjang 2048 px, WebP), supaya unggahan kecil dan cepat
 * dan tidak mentok batas ukuran permintaan hosting. Bila gagal (mis. format tidak didukung kanvas), berkas asli dipakai.
 */
export async function kecilkanGambar(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const skala = Math.min(1, SISI_MAKS / Math.max(bmp.width, bmp.height));
    if (skala === 1 && file.size <= 3 * 1024 * 1024) {
      bmp.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * skala);
    canvas.height = Math.round(bmp.height * skala);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.9));
    return blob ? new File([blob], "panel.webp", { type: "image/webp" }) : file;
  } catch {
    return file;
  }
}
