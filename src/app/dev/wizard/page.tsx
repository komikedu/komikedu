import { notFound } from "next/navigation";
import { WIZARD_STEPS } from "@/lib/comics/schema";
import { WizardForm } from "@/app/comics/[id]/wizard/wizard-form";

/** Pratinjau wizard dengan data contoh, tanpa login dan tanpa menyimpan. Hanya ada saat development. */
export default async function DevWizardPage({ searchParams }: { searchParams: Promise<{ langkah?: string; sumber?: string; tokoh?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = await searchParams;
  const step = Math.min(WIZARD_STEPS, Math.max(1, Number(sp.langkah) || 1));
  const cerita = sp.sumber === "cerita";
  const contoh = [
    { id: "cerita-kancil", nama: "Kancil", peran: "tokoh utama", deskripsi: "Kancil kecil cerdik berbulu cokelat muda dengan bintik putih, mata besar yang lincah.", preset: false },
    { id: "cerita-buaya", nama: "Buaya", peran: "lawan", deskripsi: "Buaya besar berkulit hijau tua, gigi tajam tapi wajah dibuat lucu dan ramah anak.", preset: false },
  ];

  async function simpanPalsu() {
    "use server";
    return { ok: true };
  }

  return (
    <div className="min-h-screen">
      <WizardForm
        comicId="00000000-0000-4000-8000-000000000000"
        userId="00000000-0000-4000-8000-000000000001"
        initial={{ judul: "Komik tanpa judul", topik: "KPK dan FPB", jenjang: 5, tujuan: null, cerita: cerita ? "Si Kancil berjalan di tepi sungai. ".repeat(6) : null, tokoh_json: cerita && sp.tokoh ? contoh : [], jumlah_halaman: 8, halaman_otomatis: false, panel_per_halaman: null, panel_per_halaman_maks: null, dengan_sampul: false, sumber: cerita ? "cerita" : "topik", tema: null, bahasa: "indonesia", gaya: null, lebar_halaman: 900, tinggi_halaman: 1200, wizard_step: step }}
        materiAwal={null}
        naskahStatus="none"
        naskahError={null}
        tokohLama={cerita ? [{ comicId: "00000000-0000-4000-8000-000000000001", judulKomik: "Petualangan Pecahan", tokoh: { id: "sendiri-1", nama: "Raka", peran: "", deskripsi: "anak laki-laki kelas 4", preset: false } }, { comicId: "00000000-0000-4000-8000-000000000001", judulKomik: "Petualangan Pecahan", tokoh: { id: "sendiri-2", nama: "Kancil", peran: "", deskripsi: "kancil", preset: false } }] : []}
        saldo={13}
        simpan={simpanPalsu}
      />
    </div>
  );
}
