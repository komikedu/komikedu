import { getLayout } from "@/lib/ai/layouts";
import type { Script } from "@/lib/ai/schemas";
import { layoutHalaman } from "./naskah";
import { buatPromptFlow, rasioTerdekat, tokohDiTeks } from "./prompt-flow";
import { GAYA } from "./schema";
import type { Tokoh } from "./tokoh";

/** Ukuran halaman editor (900 x 1200), dipakai untuk bentuk asli tiap panel dari layout. */
const HAL_W = 900;
const HAL_H = 1200;

type Dialog = Script["halaman"][number]["panel"][number]["dialog"][number];

const urut = <T extends { urutan: number }>(a: T[]) => [...a].sort((x, y) => x.urutan - y.urutan);

export type NaskahFlow = {
  petunjuk: string;
  judul: string;
  gaya: string;
  tokoh: { nama: string; deskripsi: string }[];
  panel: { no: number; halaman: number; panel: number; rasio: string; prompt: string; dialog: Dialog[] }[];
};

/**
 * Seluruh naskah sebagai JSON untuk Google Flow: satu item per panel, tiap `prompt` berdiri sendiri (gaya, tokoh, adegan,
 * aturan tanpa teks) sehingga bisa dibuat satu per satu. Dialog hanya konteks cerita, bukan untuk digambar.
 * Panel tanpa adegan dilewati karena tidak ada yang bisa digambar.
 */
export function buatNaskahFlow(i: { judul: string; gaya: string | null; tokoh: Tokoh[]; naskah: Script }): NaskahFlow {
  const gaya = GAYA.find((g) => g.id === i.gaya) ?? GAYA[0];
  const panel: NaskahFlow["panel"] = [];
  for (const h of urut(i.naskah.halaman)) {
    const rects = getLayout(layoutHalaman(h)).panels;
    urut(h.panel).forEach((p, idx) => {
      const adegan = p.adegan.trim();
      if (!adegan) return;
      const r = rects[idx] ?? { w: 1, h: 1 };
      const rasio = rasioTerdekat(r.w * HAL_W, r.h * HAL_H);
      const dialog = p.dialog.filter((d) => d.teks.trim());
      const tampil = tokohDiTeks(i.tokoh, [adegan, ...p.karakter, ...p.dialog.map((d) => d.karakter)].join(" "));
      panel.push({
        no: panel.length + 1,
        halaman: h.urutan,
        panel: p.urutan,
        rasio,
        prompt: buatPromptFlow({ adegan, gaya: gaya.prompt, tokoh: tampil, rasio, balon: dialog.length }),
        dialog,
      });
    });
  }
  return {
    petunjuk:
      "Buat satu gambar terpisah untuk SETIAP item di daftar 'panel', berurutan sesuai 'no'. Pakai field 'prompt' apa adanya dan atur rasio gambar sesuai field 'rasio'. " +
      "Jangan menggambar teks atau balon kata di gambar. Field 'dialog' hanya konteks cerita, jangan ditulis di gambar. Tokoh harus terlihat sama di semua gambar.",
    judul: i.judul,
    gaya: gaya.nama,
    tokoh: i.tokoh.filter((t) => t.nama && t.deskripsi).map((t) => ({ nama: t.nama, deskripsi: t.deskripsi })),
    panel,
  };
}

/** Satu baris dialog dalam format skrip komik: "DONI: teks", "SARI (pikir): teks", "NARASI: teks". */
export function barisDialog(d: Dialog): string {
  const nama = d.karakter.trim();
  if (d.jenis === "narasi") return `NARASI: ${d.teks.trim()}`;
  return `${(nama || "?").toUpperCase()}${d.jenis === "pikir" ? " (pikir)" : ""}: ${d.teks.trim()}`;
}

/** Seluruh naskah sebagai teks skrip komik biasa, untuk dibaca atau ditempel ke dokumen lain. */
export function teksNaskah(judul: string, naskah: Script): string {
  const baris: string[] = [judul.toUpperCase()];
  for (const h of urut(naskah.halaman)) {
    baris.push("", `HALAMAN ${h.urutan}`);
    for (const p of urut(h.panel)) {
      baris.push("", `Panel ${p.urutan}`, `Adegan: ${p.adegan.trim() || "(belum diisi)"}`);
      for (const d of p.dialog) if (d.teks.trim()) baris.push(barisDialog(d));
    }
  }
  return baris.join("\n");
}
