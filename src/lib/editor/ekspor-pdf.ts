import { PDFDocument } from "pdf-lib";

/** Ukuran halaman PDF dalam poin (3:4, sama dengan rasio halaman editor): 7,5 x 10 inci. */
export const PDF_LEBAR = 540;
export const PDF_TINGGI = 720;

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

/** Gabungkan gambar JPEG halaman (urut) menjadi satu PDF, satu halaman per gambar memenuhi seluruh lembar. */
export async function buatPdf(jpegs: Uint8Array[], judul: string): Promise<Uint8Array> {
  if (!jpegs.length) throw new Error("Tidak ada halaman untuk diekspor");
  const pdf = await PDFDocument.create();
  pdf.setTitle(judul || "Komik");
  pdf.setCreator("KomikEdu");
  pdf.setProducer("KomikEdu");
  for (const bytes of jpegs) {
    const gambar = await pdf.embedJpg(bytes);
    const halaman = pdf.addPage([PDF_LEBAR, PDF_TINGGI]);
    halaman.drawImage(gambar, { x: 0, y: 0, width: PDF_LEBAR, height: PDF_TINGGI });
  }
  return pdf.save();
}
