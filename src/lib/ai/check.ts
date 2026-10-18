import { verifyClaim } from "@/lib/math/verify";
import { MAX_BALLOON_WORDS, type Flag, type Script } from "./schemas";

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/** Cek deterministik terhadap naskah: hitungan (mathjs) dan panjang balon. */
export function checkScript(script: Script): Flag[] {
  const flags: Flag[] = [];
  for (const page of script.halaman) {
    for (const panel of page.panel) {
      for (const h of panel.hitungan) {
        const res = verifyClaim({ expression: h.ekspresi, claimed: h.hasilTertulis });
        if (!res.ok) {
          flags.push({
            halaman: page.urutan,
            panel: panel.urutan,
            jenis: "hitungan",
            alasan: `${h.ekspresi}: ${res.reason}`,
          });
        }
      }
      for (const d of panel.dialog) {
        if (wordCount(d.teks) > MAX_BALLOON_WORDS) {
          flags.push({
            halaman: page.urutan,
            panel: panel.urutan,
            jenis: "panjang-balon",
            alasan: `Balon ${d.karakter} lebih dari ${MAX_BALLOON_WORDS} kata`,
          });
        }
      }
    }
  }
  return flags;
}
