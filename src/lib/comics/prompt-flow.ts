import { ATURAN_TEKS, ruangBalon } from "@/lib/ai/page-prompt";
import { gambarTokoh, isPresetId, type Tokoh } from "./tokoh";

/** Rasio gambar yang bisa dipilih di Google Flow. */
const RASIO_FLOW = [
  { label: "16:9", nilai: 16 / 9 },
  { label: "4:3", nilai: 4 / 3 },
  { label: "1:1", nilai: 1 },
  { label: "3:4", nilai: 3 / 4 },
  { label: "9:16", nilai: 9 / 16 },
] as const;

/** Rasio Flow yang paling dekat dengan bentuk panel (lebar x tinggi di kanvas). */
export function rasioTerdekat(w: number, h: number): string {
  if (!(w > 0) || !(h > 0)) return "1:1";
  const r = Math.log(w / h);
  return RASIO_FLOW.reduce((a, b) => (Math.abs(Math.log(b.nilai) - r) < Math.abs(Math.log(a.nilai) - r) ? b : a)).label;
}

/** Tokoh yang disebut namanya di teks (adegan atau dialog), dalam urutan daftar tokoh. */
export function tokohDiTeks(tokoh: Tokoh[], teks: string): Tokoh[] {
  const t = teks.toLowerCase();
  return tokoh.filter((k) => k.nama.trim() && t.includes(k.nama.trim().toLowerCase()));
}

/** Alamat gambar potret tokoh untuk diunduh sebagai acuan; null bila tokoh belum punya gambar. */
export function alamatPotret(t: Tokoh, gaya: string | null): string | null {
  if (t.preset && isPresetId(t.id)) return gambarTokoh(t.id, gaya);
  return t.potret ?? t.badan ?? null;
}

export type PromptFlowInput = {
  adegan: string;
  /** deskripsi gaya visual (GAYA[].prompt) */
  gaya: string;
  tokoh: Tokoh[];
  /** rasio Flow, mis. "4:3" */
  rasio: string;
  /** nama berkas acuan per tokoh, sesuai yang diunduh guru; tokoh yang tidak ada di sini dianggap tanpa gambar */
  acuan?: Record<string, string>;
  /** jumlah balon dialog di panel; menentukan ruang kosong di bagian atas gambar (kosong = anggap 1-2) */
  balon?: number;
};

/**
 * Prompt satu panel untuk ditempel di Google Flow. Tidak menyebut gambar acuan kecuali tokohnya punya berkas acuan
 * (guru mengunggahnya sendiri di Flow). Dialog tidak ikut: balon dibuat di editor, bukan di dalam gambar.
 */
export function buatPromptFlow(i: PromptFlowInput): string {
  const adegan = i.adegan.replace(/@/g, "").replace(/\s+/g, " ").trim();
  if (!adegan) throw new Error("Adegan panel kosong");
  const ada = (t: Tokoh) => !!i.acuan?.[t.nama];
  const chars = i.tokoh
    .map((t) =>
      ada(t)
        ? `- ${t.nama}: wajah, jenis kelamin, rambut, kacamata, dan pakaian PERSIS seperti gambar acuan "${i.acuan![t.nama]}". Bila catatan ini berbeda dari gambar, ikuti gambar. Catatan: ${t.deskripsi}`
        : `- ${t.nama}: ${t.deskripsi}`,
    )
    .join("\n");
  return [
    `Satu adegan ilustrasi komik edukasi untuk anak SD Indonesia, gaya ${i.gaya}. Gambar penuh satu bingkai (rasio ${i.rasio}), tanpa pembagian panel.`,
    `Adegan: ${adegan}`,
    chars ? `Tokoh yang tampil (harus terlihat identik di semua panel komik):\n${chars}` : "",
    ruangBalon(i.balon).trim(),
    ATURAN_TEKS + "Konten ramah anak, tanpa kekerasan.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
