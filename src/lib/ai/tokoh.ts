const BUKAN_TOKOH = new Set(["narasi", "narator", "narrator", ""]);

/** Kumpulkan nama tokoh unik dari naskah (daftar karakter panel dan pembicara dialog). */
export function namaTokoh(panels: { karakter?: string[]; dialog?: { karakter: string }[] }[]): string[] {
  const nama = new Map<string, string>();
  for (const p of panels) {
    for (const n of [...(p.karakter ?? []), ...(p.dialog ?? []).map((d) => d.karakter)]) {
      const key = n.trim().toLowerCase();
      if (!BUKAN_TOKOH.has(key) && !nama.has(key)) nama.set(key, n.trim());
    }
  }
  return [...nama.values()].slice(0, 8);
}

/**
 * Nama tokoh di naskah yang belum ada di daftar tokoh komik (tanpa peduli huruf besar-kecil), dalam urutan kemunculan.
 * Dihitung dari seluruh nama dulu baru dipotong, supaya tokoh yang sudah terdaftar tidak menutup tempat tokoh yang belum.
 */
export function tokohBelumAda(panels: { karakter?: string[]; dialog?: { karakter: string }[] }[], tokoh: { nama: string }[], maks = 8): string[] {
  const ada = new Set(tokoh.map((t) => t.nama.trim().toLowerCase()));
  const nama = new Map<string, string>();
  for (const p of panels) {
    for (const n of [...(p.karakter ?? []), ...(p.dialog ?? []).map((d) => d.karakter)]) {
      const key = n.trim().toLowerCase();
      if (!BUKAN_TOKOH.has(key) && !ada.has(key) && !nama.has(key)) nama.set(key, n.trim());
    }
  }
  return [...nama.values()].slice(0, maks);
}
