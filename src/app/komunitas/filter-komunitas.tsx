"use client";

import { Dropdown } from "@/components/dropdown";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { BAHASA, JENJANG_KELAS, TEMA, adaFilter, urlKomunitas, type FilterKomunitas } from "@/lib/comics/klasifikasi";

const pilihan = "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-foreground";

/** Saring galeri komunitas menurut jenjang (kelas), tema, dan bahasa. Memilih langsung memuat ulang daftar. */
export function FilterKomunitasForm({ filter }: { filter: FilterKomunitas }) {
  const router = useRouter();
  const [memuat, mulai] = useTransition();

  function ubah(bagian: Partial<Record<keyof FilterKomunitas, string>>) {
    const baru: FilterKomunitas = { ...filter };
    for (const [kunci, nilai] of Object.entries(bagian)) {
      if (kunci === "jenjang") baru.jenjang = nilai ? Number(nilai) : undefined;
      if (kunci === "tema") baru.tema = (nilai || undefined) as FilterKomunitas["tema"];
      if (kunci === "bahasa") baru.bahasa = (nilai || undefined) as FilterKomunitas["bahasa"];
    }
    mulai(() => router.push(urlKomunitas(baru)));
  }

  return (
    <form role="search" aria-label="Saring komik" aria-busy={memuat} onSubmit={(e) => e.preventDefault()} className="mt-5 rounded-xl border border-line bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-semibold">
          Jenjang
          <Dropdown value={filter.jenjang ?? ""} onChange={(e) => ubah({ jenjang: e.target.value })} className={pilihan}>
            <option value="">Semua jenjang</option>
            {JENJANG_KELAS.map((k) => (
              <option key={k} value={k}>
                SD kelas {k}
              </option>
            ))}
          </Dropdown>
        </label>
        <label className="text-sm font-semibold">
          Tema
          <Dropdown value={filter.tema ?? ""} onChange={(e) => ubah({ tema: e.target.value })} className={pilihan}>
            <option value="">Semua tema</option>
            {TEMA.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nama}
              </option>
            ))}
          </Dropdown>
        </label>
        <label className="text-sm font-semibold">
          Bahasa
          <Dropdown value={filter.bahasa ?? ""} onChange={(e) => ubah({ bahasa: e.target.value })} className={pilihan}>
            <option value="">Semua bahasa</option>
            {BAHASA.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nama}
              </option>
            ))}
          </Dropdown>
        </label>
      </div>
      {adaFilter(filter) && (
        <p className="mt-3 text-xs">
          <Link href="/komunitas" className="font-medium text-brand hover:underline">
            Hapus semua saringan
          </Link>
        </p>
      )}
    </form>
  );
}
