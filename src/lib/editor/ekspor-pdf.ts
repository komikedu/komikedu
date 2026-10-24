import { PDFDocument } from "pdf-lib";

/** Sisi terpanjang lembar PDF dalam poin (10 inci). Lembar mengikuti rasio gambar: halaman 3:4 menjadi 540 x 720. */
export const PDF_SISI = 720;

/** Ukuran lembar PDF (poin) untuk gambar berukuran lebar x tinggi piksel. */
export function ukuranLembar(lebar: number, tinggi: number): { lebar: number; tinggi: number } {
  const k = PDF_SISI / Math.max(lebar, tinggi);
  return { lebar: Math.round(lebar * k), tinggi: Math.round(tinggi * k) };
}

/** Nama berkas aman dari judul komik: tanpa karakter terlarang, maksimal 80 karakter, selalu berakhiran .pdf. */
export function namaBerkasPdf(judul: string): string {
  const bersih = judul
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 _-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .trim();
  return `${bersih || "komik"}.pdf`;
}

/** Gabungkan gambar JPEG halaman (urut) menjadi satu PDF, satu halaman per gambar memenuhi seluruh lembar (lembar mengikuti rasio gambar). */
export async function buatPdf(jpegs: Uint8Array[], judul: string): Promise<Uint8Array> {
  if (!jpegs.length) throw new Error("Tidak ada halaman untuk diekspor");
  const pdf = await PDFDocument.create();
  pdf.setTitle(judul || "Komik");
  pdf.setCreator("KomikEdu");
  pdf.setProducer("KomikEdu");
  for (const bytes of jpegs) {
    const gambar = await pdf.embedJpg(bytes);
    const { lebar, tinggi } = ukuranLembar(gambar.width, gambar.height);
    const halaman = pdf.addPage([lebar, tinggi]);
    halaman.drawImage(gambar, { x: 0, y: 0, width: lebar, height: tinggi });
  }
  return pdf.save();
}
