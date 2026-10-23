import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { PDF_LEBAR, PDF_TINGGI, buatPdf, namaBerkasPdf } from "./ekspor-pdf";

const jpeg = (warna: string) => sharp({ create: { width: 90, height: 120, channels: 3, background: warna } }).jpeg().toBuffer();

describe("buatPdf", () => {
  it("satu halaman per gambar, ukuran 3:4, berurutan, dengan judul", async () => {
    const bytes = await buatPdf([new Uint8Array(await jpeg("#ff0000")), new Uint8Array(await jpeg("#0000ff")), new Uint8Array(await jpeg("#00ff00"))], "Petualangan KPK");
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(3);
    for (const h of pdf.getPages()) expect(h.getSize()).toEqual({ width: PDF_LEBAR, height: PDF_TINGGI });
    expect(PDF_LEBAR / PDF_TINGGI).toBeCloseTo(3 / 4);
    expect(pdf.getTitle()).toBe("Petualangan KPK");
  });

  it("menolak daftar halaman kosong dan data yang bukan JPEG", async () => {
    await expect(buatPdf([], "x")).rejects.toThrow();
    await expect(buatPdf([new Uint8Array([1, 2, 3])], "x")).rejects.toThrow();
  });
});

describe("namaBerkasPdf", () => {
  it("membersihkan judul menjadi nama berkas aman", () => {
    expect(namaBerkasPdf("Joko dan Petualangan Angka 1 sampai 100")).toBe("Joko dan Petualangan Angka 1 sampai 100.pdf");
    expect(namaBerkasPdf('KPK/FPB: "Kelas 5"?')).toBe("KPK FPB Kelas 5.pdf");
    expect(namaBerkasPdf("Pecahan Èksak")).toBe("Pecahan Eksak.pdf");
    expect(namaBerkasPdf("   ")).toBe("komik.pdf");
    expect(namaBerkasPdf("../../etc/passwd")).toBe("etc passwd.pdf");
    expect(namaBerkasPdf("a".repeat(200)).length).toBeLessThanOrEqual(84);
  });
});
