"use client";

import { BAHASA, TEMA } from "@/lib/comics/klasifikasi";
import { GAYA, type Draft } from "@/lib/comics/schema";

type Baris = { label: string; langkah: number; isi: React.ReactNode };

/** Teks jumlah panel per halaman: Otomatis, tepat n panel, atau rentang. */
function teksPanel(d: Pick<Draft, "panel_per_halaman" | "panel_per_halaman_maks">): string {
  if (d.panel_per_halaman === null) return "Panel otomatis";
  if (d.panel_per_halaman_maks !== null && d.panel_per_halaman_maks > d.panel_per_halaman) return `${d.panel_per_halaman}–${d.panel_per_halaman_maks} panel per halaman`;
  return `${d.panel_per_halaman} panel per halaman`;
}

/** Ringkasan semua pilihan di langkah 1-5; tiap baris punya tombol Ubah yang membuka langkahnya. */
export function RingkasanPilihan({ draft, onUbah }: { draft: Draft; onUbah: (langkah: number) => void }) {
  const cerita = (draft.cerita ?? "").trim();
  const tema = TEMA.find((t) => t.id === draft.tema)?.nama;
  const bahasa = BAHASA.find((b) => b.id === draft.bahasa)?.nama ?? "Indonesia";
  const gaya = GAYA.find((g) => g.id === draft.gaya)?.nama;
  const tokoh = draft.tokoh_json;
  const halaman = draft.halaman_otomatis ? "Jumlah halaman otomatis" : `${draft.jumlah_halaman} halaman`;

  const baris: Baris[] = [
    {
      label: "Cerita",
      langkah: 1,
      isi: (
        <>
          <span className="line-clamp-2 whitespace-pre-line">{cerita}</span>
          <span className="mt-0.5 block text-xs text-gray-500">{cerita.length.toLocaleString("id-ID")} karakter</span>
        </>
      ),
    },
    { label: "Kelas dan tema", langkah: 2, isi: `Kelas ${draft.jenjang}${tema ? ` · ${tema}` : ""} · Bahasa ${bahasa}` },
    { label: "Gaya gambar", langkah: 3, isi: gaya ?? "Belum dipilih" },
    {
      label: "Halaman",
      langkah: 4,
      isi: `${halaman}${draft.dengan_sampul ? " + sampul" : ""} · ${teksPanel(draft)} · ${draft.lebar_halaman}×${draft.tinggi_halaman}`,
    },
    {
      label: "Tokoh",
      langkah: 5,
      isi: tokoh.length ? tokoh.map((t) => t.nama).join(", ") : "Tidak dipilih, AI membuat tokoh sendiri",
    },
  ];

  return (
    <dl className="flex flex-col gap-5">
      {baris.map((b) => (
        <div key={b.label} className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{b.label}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-gray-700">{b.isi}</dd>
          </div>
          <button type="button" onClick={() => onUbah(b.langkah)} aria-label={`Ubah ${b.label.toLowerCase()}`} className="shrink-0 text-sm font-medium text-brand hover:underline">
            Ubah
          </button>
        </div>
      ))}
    </dl>
  );
}
