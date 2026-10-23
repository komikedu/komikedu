import { notFound } from "next/navigation";
import { WizardForm } from "@/app/comics/[id]/wizard/wizard-form";

/** Pratinjau wizard dengan data contoh, tanpa login dan tanpa menyimpan. Hanya ada saat development. */
export default async function DevWizardPage({ searchParams }: { searchParams: Promise<{ langkah?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const step = Math.min(5, Math.max(1, Number((await searchParams).langkah) || 1));

  async function simpanPalsu() {
    "use server";
    return { ok: true };
  }

  return (
    <div className="min-h-screen">
      <WizardForm
        comicId="00000000-0000-4000-8000-000000000000"
        userId="00000000-0000-4000-8000-000000000001"
        initial={{ judul: "Komik tanpa judul", topik: "KPK dan FPB", jenjang: 5, tujuan: null, cerita: null, tokoh_json: [], jumlah_halaman: 8, gaya: null, wizard_step: step }}
        materiAwal={null}
        naskahStatus="none"
        naskahError={null}
        saldo={13}
        simpan={simpanPalsu}
      />
    </div>
  );
}
