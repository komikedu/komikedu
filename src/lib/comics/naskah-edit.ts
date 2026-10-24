import { z } from "zod";
import { getLayout, isLayoutId } from "@/lib/ai/layouts";
import { ScriptSchema } from "@/lib/ai/schemas";

export const NASKAH_COST = 2;
/** 12 halaman isi ditambah satu halaman sampul. */
export const MAX_NASKAH_PAGES = 13;

/** Batas tambahan saat guru mengedit naskah, di atas skema keluaran AI. */
export const NaskahEditSchema = ScriptSchema.superRefine((s, ctx) => {
  if (s.halaman.length < 1 || s.halaman.length > MAX_NASKAH_PAGES) {
    ctx.addIssue({ code: "custom", message: `Jumlah halaman harus 1 sampai ${MAX_NASKAH_PAGES}` });
  }
  for (const h of s.halaman) {
    if (h.layout !== undefined && (!isLayoutId(h.layout) || getLayout(h.layout).panels.length !== h.panel.length)) {
      ctx.addIssue({ code: "custom", message: "Layout tidak cocok dengan jumlah panel" });
    }
    for (const p of h.panel) {
      if (p.adegan.length > 1000) ctx.addIssue({ code: "custom", message: "Deskripsi adegan terlalu panjang" });
      if (p.dialog.length > 6) ctx.addIssue({ code: "custom", message: "Maksimal 6 balon per panel" });
      for (const d of p.dialog) {
        if (d.teks.length > 300 || d.karakter.length > 60) ctx.addIssue({ code: "custom", message: "Teks balon terlalu panjang" });
      }
      if (p.hitungan.length > 10) ctx.addIssue({ code: "custom", message: "Terlalu banyak hitungan" });
    }
  }
});

export const uuid = z.string().uuid();
