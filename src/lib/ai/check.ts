import { verifyClaim } from "@/lib/math/verify";
import { MAX_BALLOON_WORDS, type Flag, type Script } from "./schemas";

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/** Cek deterministik terhadap naskah: hitungan (mathjs) dan panjang balon. */
export function checkScript(script: Script): Flag[] {
  const flags: Flag[] = [];
  for (const page of script.halaman) {
    for (const panel of page.panel) {
      if (!panel.adegan.trim()) {
        flags.push({ halaman: page.urutan, panel: panel.urutan, jenis: "adegan-kosong", alasan: "Adegan panel masih kosong" });
      }
      panel.hitungan.forEach((h, i) => {
        const res = verifyClaim({ expression: h.ekspresi, claimed: h.hasilTertulis });
        if (!res.ok) {
          flags.push({
            halaman: page.urutan,
            panel: panel.urutan,
            jenis: "hitungan",
            alasan: `${h.ekspresi}: ${res.reason}`,
            hitungan: i,
            ...(res.actual !== null ? { seharusnya: res.actual } : {}),
          });
        }
      });
      panel.dialog.forEach((d, i) => {
        if (!d.teks.trim()) {
          flags.push({ halaman: page.urutan, panel: panel.urutan, jenis: "balon-kosong", alasan: "Teks balon masih kosong", dialog: i });
        } else if (wordCount(d.teks) > MAX_BALLOON_WORDS) {
          flags.push({
            halaman: page.urutan,
            panel: panel.urutan,
            jenis: "panjang-balon",
            alasan: `Balon ${d.karakter} lebih dari ${MAX_BALLOON_WORDS} kata`,
            dialog: i,
          });
        }
      });
    }
  }
  return flags;
}
