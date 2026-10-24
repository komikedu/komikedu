import { getLayout } from "@/lib/ai/layouts";
import type { Script } from "@/lib/ai/schemas";
import { layoutHalaman } from "./naskah";
import { buatPromptFlow, rasioTerdekat, tokohDiTeks } from "./prompt-flow";
import { GAYA } from "./schema";
import { UKURAN_BAWAAN, type EditorPage, type UkuranHalaman } from "@/lib/editor/types";
import type { Tokoh } from "./tokoh";


type Dialog = Script["halaman"][number]["panel"][number]["dialog"][number];

const urut = <T extends { urutan: number }>(a: T[]) => [...a].sort((x, y) => x.urutan - y.urutan);

export type NaskahFlow = {
  petunjuk: string;
  judul: string;
  gaya: string;
  tokoh: { nama: string; deskripsi: string }[];
  panel: { no: number; halaman: number; panel: number; sampul?: boolean; nama_berkas: string; rasio: string; prompt: string; dialog: Dialog[] }[];
};

/**
 * Seluruh naskah sebagai JSON untuk Google Flow: satu item per panel, tiap `prompt` berdiri sendiri (gaya, tokoh, adegan,
 * aturan tanpa teks) sehingga bisa dibuat satu per satu. Dialog hanya konteks cerita, bukan untuk digambar.
 * Panel tanpa adegan dilewati karena tidak ada yang bisa digambar.
 */
export function buatNaskahFlow(i: { judul: string; gaya: string | null; tokoh: Tokoh[]; naskah: Script; ukuran?: UkuranHalaman }): NaskahFlow {
  const ukuran = i.ukuran ?? UKURAN_BAWAAN;
  const gaya = GAYA.find((g) => g.id === i.gaya) ?? GAYA[0];
  const panel: NaskahFlow["panel"] = [];
  for (const h of urut(i.naskah.halaman)) {
    const rects = getLayout(layoutHalaman(h)).panels;
    urut(h.panel).forEach((p, idx) => {
      const adegan = p.adegan.trim();
      if (!adegan) return;
      const r = rects[idx] ?? { w: 1, h: 1 };
      const rasio = rasioTerdekat(r.w * ukuran.w, r.h * ukuran.h);
      const dialog = p.dialog.filter((d) => d.teks.trim());
      const tampil = tokohDiTeks(i.tokoh, [adegan, ...p.karakter, ...p.dialog.map((d) => d.karakter)].join(" "));
      panel.push({
        no: panel.length + 1,
        halaman: h.urutan,
        panel: p.urutan,
        ...(h.sampul ? { sampul: true } : {}),
        nama_berkas: `${h.urutan}-${p.urutan}`,
        rasio,
        prompt: buatPromptFlow({ adegan, gaya: gaya.prompt, tokoh: tampil, rasio, balon: dialog.length, sampul: h.sampul === true }),
        dialog,
      });
    });
  }
  return {
    petunjuk:
      "Buat satu gambar terpisah untuk SETIAP item di daftar 'panel', berurutan sesuai 'no'. Pakai field 'prompt' apa adanya dan atur rasio gambar sesuai field 'rasio'. " +
      "Jangan menggambar teks atau balon kata di gambar. Field 'dialog' hanya konteks cerita, jangan ditulis di gambar. Tokoh harus terlihat sama di semua gambar. " +
      "Setelah selesai, beri nama setiap berkas gambar sesuai field 'nama_berkas' (mis. 1-1.png untuk halaman 1 panel 1) agar bisa dipasang ke panel dengan satu kali seret dan lepas.",
    judul: i.judul,
    gaya: gaya.nama,
    tokoh: i.tokoh.filter((t) => t.nama && t.deskripsi).map((t) => ({ nama: t.nama, deskripsi: t.deskripsi })),
    panel,
  };
}

/**
 * Seperti buatNaskahFlow, tetapi dari halaman yang sedang ada di editor (adegan sudah bisa disunting guru). Panel diberi nama
 * berkas "halaman-panel" menurut urutannya; jumlah balon dihitung dari balon yang terlihat di panel itu agar prompt
 * menyisakan ruang balon. Panel tanpa adegan dilewati.
 */
export function buatFlowDariHalaman(i: { judul: string; gaya: string | null; tokoh: Tokoh[]; halaman: EditorPage[] }): NaskahFlow {
  const gaya = GAYA.find((g) => g.id === i.gaya) ?? GAYA[0];
  const panel: NaskahFlow["panel"] = [];
  i.halaman.forEach((h, hi) => {
    h.panels.forEach((p, pi) => {
      const adegan = p.adegan.trim();
      if (!adegan) return;
      const rasio = rasioTerdekat(p.w, p.h);
      const teks = h.bubbles.filter((b) => b.panelId === p.id && b.visible && b.text.trim());
      const tampil = tokohDiTeks(i.tokoh, [adegan, ...teks.map((b) => b.text)].join(" "));
      panel.push({
        no: panel.length + 1,
        halaman: hi + 1,
        panel: pi + 1,
        nama_berkas: `${hi + 1}-${pi + 1}`,
        rasio,
        prompt: buatPromptFlow({ adegan, gaya: gaya.prompt, tokoh: tampil, rasio, balon: teks.length }),
        dialog: [],
      });
    });
  });
  return {
    petunjuk:
      "Buat satu gambar terpisah untuk SETIAP item di daftar 'panel', berurutan sesuai 'no'. Pakai field 'prompt' apa adanya dan atur rasio gambar sesuai field 'rasio'. " +
      "Jangan menggambar teks atau balon kata di gambar. Tokoh harus terlihat sama di semua gambar. " +
      "Setelah selesai, beri nama setiap berkas gambar sesuai field 'nama_berkas' (mis. 1-1.png untuk halaman 1 panel 1) agar bisa dipasang ke panel dengan satu kali seret dan lepas.",
    judul: i.judul,
    gaya: gaya.nama,
    tokoh: i.tokoh.filter((t) => t.nama && t.deskripsi).map((t) => ({ nama: t.nama, deskripsi: t.deskripsi })),
    panel,
  };
}

/** Semua prompt panel sebagai teks biasa, satu blok per panel dengan nama berkasnya, untuk ditempel ke ChatGPT atau Flow. */
export function teksPromptPanel(flow: NaskahFlow): string {
  return flow.panel.map((p) => `[${p.nama_berkas}] Rasio ${p.rasio}\n${p.prompt}`).join("\n\n----------\n\n");
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
