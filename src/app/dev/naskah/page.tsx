import { notFound } from "next/navigation";
import { AppHeaderView } from "@/components/app-header";
import { NaskahView } from "@/app/comics/[id]/naskah/naskah-view";
import { checkScript } from "@/lib/ai/check";
import type { Script } from "@/lib/ai/schemas";
import { NaskahEditSchema } from "@/lib/comics/naskah-edit";

const CONTOH: Script = {
  halaman: [
    {
      urutan: 1,
      panel: [
        {
          urutan: 1,
          adegan: "Doni dan Sari berjalan memasuki taman bermain yang cerah dan penuh warna.",
          karakter: ["Doni", "Sari"],
          dialog: [
            { karakter: "Narasi", jenis: "narasi", teks: "Doni dan Sari tiba di taman bermain sekolah." },
            { karakter: "Doni", jenis: "bicara", teks: "Sari, lihat papan seluncuran itu!" },
          ],
          hitungan: [],
        },
        {
          urutan: 2,
          adegan: "Sari menunjuk sisi papan seluncuran yang berbentuk segitiga.",
          karakter: ["Sari"],
          dialog: [{ karakter: "Sari", jenis: "bicara", teks: "Sisinya berbentuk segitiga. Kelilingnya 3 + 4 + 5 = 13 meter!" }],
          hitungan: [{ ekspresi: "3 + 4 + 5", hasilTertulis: 13 }],
        },
        {
          urutan: 3,
          adegan: "Doni berpikir sambil memandangi kotak pasir persegi.",
          karakter: ["Doni"],
          dialog: [{ karakter: "Doni", jenis: "pikir", teks: "Kotak pasir itu persegi, sisinya 2 meter." }],
          hitungan: [],
        },
      ],
    },
  ],
};

/** Pratinjau tinjauan naskah dengan data contoh, tanpa login. Hanya ada saat development. */
export default async function DevNaskahPage({ searchParams }: { searchParams: Promise<{ berubah?: string }> }) {
  const berubah = (await searchParams).berubah === "1";
  if (process.env.NODE_ENV === "production") notFound();

  async function simpanPalsu(_id: string, naskah: unknown) {
    "use server";
    const parsed = NaskahEditSchema.safeParse(naskah);
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Naskah tidak valid" };
    return { ok: true as const, flags: checkScript(parsed.data) };
  }

  return (
    <div className="min-h-screen bg-surface-muted">
      <AppHeaderView user={{ email: "guru@sekolah.sch.id", nama: "Bu Rina", saldo: 13 }} />
      <NaskahView
        comicId="00000000-0000-4000-8000-000000000000"
        judul="Petualangan Bangun Datar di Taman Bermain"
        ringkasan={{ topik: "Bangun datar", jenjang: 5, jumlahHalaman: 4, halamanOtomatis: false, sumber: "topik", gaya: "kartun-cerah", adaMateri: false }}
        status="review"
        pengaturanBerubah={berubah}
        naskah={CONTOH}
        flags={checkScript(CONTOH)}
        versi="contoh"
        saldo={13}
        adaHalamanEditor={false}
        simpanNaskah={simpanPalsu}
      />
    </div>
  );
}
