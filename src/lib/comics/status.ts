export type ComicSummary = {
  id: string;
  judul: string;
  jenjang: number;
  status: "draft" | "diproses" | "terbit";
  naskah_status: "none" | "generating" | "review" | "approved" | "error";
  topik: string | null;
  gaya: string | null;
  adaMateri: boolean;
  created_at: string;
};

export type NextStep = {
  /** Label status singkat untuk badge kartu. */
  badge: string;
  tone: "neutral" | "progress" | "attention" | "done";
  /** Tombol langkah berikutnya. */
  aksi: string;
  href: string;
};

/** Tentukan status yang ditampilkan dan ke mana tombol utama kartu komik mengarah. */
export function nextStep(c: ComicSummary): NextStep {
  const base = `/comics/${c.id}`;
  if (c.status === "terbit") return { badge: "Terbit", tone: "done", aksi: "Buka editor", href: `${base}/editor` };
  switch (c.naskah_status) {
    case "approved":
      return { badge: "Di editor", tone: "progress", aksi: "Buka editor", href: `${base}/editor` };
    case "review":
      return { badge: "Tinjau naskah", tone: "attention", aksi: "Tinjau naskah", href: `${base}/naskah` };
    case "generating":
      return { badge: "Naskah dibuat...", tone: "progress", aksi: "Lihat naskah", href: `${base}/naskah` };
    case "error":
      return { badge: "Naskah gagal", tone: "attention", aksi: "Coba lagi", href: `${base}/wizard?langkah=4` };
    default: {
      // naskah dibuat di langkah terakhir wizard, setelah guru menulis cerita
      const siap = (!!c.topik?.trim() || c.adaMateri) && !!c.gaya;
      return siap
        ? { badge: "Draft", tone: "neutral", aksi: "Tulis cerita dan buat naskah", href: `${base}/wizard?langkah=4` }
        : { badge: "Draft", tone: "neutral", aksi: "Lanjutkan pengaturan", href: `${base}/wizard` };
    }
  }
}

const rtf = new Intl.RelativeTimeFormat("id", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "5 menit yang lalu", "kemarin", dst. */
export function waktuRelatif(iso: string, now: Date = new Date()): string {
  const diff = (new Date(iso).getTime() - now.getTime()) / 1000;
  for (const [unit, sec] of UNITS) {
    if (Math.abs(diff) >= sec) return rtf.format(Math.round(diff / sec), unit);
  }
  return "baru saja";
}
