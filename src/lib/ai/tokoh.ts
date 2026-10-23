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
