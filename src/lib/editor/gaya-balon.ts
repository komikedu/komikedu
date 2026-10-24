import type { Bubble, GayaBalon, ModeBalon } from "./types";

/** Font yang bisa dipilih untuk teks balon. `kunci` merujuk ke FONT_GAYA (font-gaya.ts). */
export const FONT_BALON: { id: string; nama: string; kunci: "comic" | "bangers" | "luckiest" | "lilita" | "titan" | "patrick" | "marker" | "fredoka" }[] = [
  { id: "comic", nama: "Komik", kunci: "comic" },
  { id: "patrick", nama: "Tulisan tangan", kunci: "patrick" },
  { id: "marker", nama: "Spidol", kunci: "marker" },
  { id: "fredoka", nama: "Bulat ramah", kunci: "fredoka" },
  { id: "bangers", nama: "Bangers", kunci: "bangers" },
  { id: "luckiest", nama: "Luckiest Guy", kunci: "luckiest" },
  { id: "lilita", nama: "Lilita One", kunci: "lilita" },
  { id: "titan", nama: "Titan One", kunci: "titan" },
];

export const MODE_BALON: { id: ModeBalon; nama: string }[] = [
  { id: "teks", nama: "Teks" },
  { id: "kotak", nama: "Kotak" },
  { id: "balon", nama: "Balon" },
];

export const GARIS_MAKS = 20;
export const STROKE_MAKS = 20;
export const RADIUS_MAKS = 100;
export const FONT_BALON_MIN = 10;
export const FONT_BALON_MAKS = 96;

/** Mode yang berlaku: pilihan guru, atau bawaan menurut jenis (narasi = kotak). */
export const modeBalon = (b: Pick<Bubble, "kind" | "gaya">): ModeBalon => b.gaya?.mode ?? (b.kind === "narasi" ? "kotak" : "balon");

export type GayaBalonTerpakai = Required<Omit<GayaBalon, "mode">> & { mode: ModeBalon };

/** Semua pengaturan tampilan sebuah balon dengan nilai bawaan terisi. */
export function gayaTerpakai(b: Pick<Bubble, "kind" | "gaya" | "bentuk">): GayaBalonTerpakai {
  const g = b.gaya ?? {};
  return {
    mode: modeBalon(b),
    font: g.font ?? "comic",
    tebal: g.tebal ?? true,
    miring: g.miring ?? false,
    rata: g.rata ?? "center",
    vertikal: g.vertikal ?? false,
    warnaTeks: g.warnaTeks ?? "#111111",
    warnaLatar: g.warnaLatar ?? (b.kind === "narasi" ? "#fff6c8" : "#ffffff"),
    tebalGaris: g.tebalGaris ?? 4,
    warnaGaris: g.warnaGaris ?? "#111111",
    rotasi: g.rotasi ?? 0,
    stroke: g.stroke ?? false,
    tebalStroke: g.tebalStroke ?? 5,
    warnaStroke: g.warnaStroke ?? "#ffffff",
    radius: g.radius ?? 4,
    ekor: g.ekor ?? (b.kind === "pikir" || b.bentuk === "awan" ? "pikir" : "lancip"),
  };
}

/** Teks dengan satu huruf per baris untuk mode vertikal; baris kosong memisahkan baris asli. */
export function susunVertikal(teks: string): string {
  return teks
    .split("\n")
    .map((baris) => Array.from(baris).join("\n"))
    .join("\n\n");
}

/** `fontStyle` Konva dari pilihan tebal dan miring. */
export const gayaHuruf = (tebal: boolean, miring: boolean) => (`${miring ? "italic " : ""}${tebal ? "bold" : ""}`.trim() || "normal");
