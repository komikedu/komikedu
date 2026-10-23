import { Bangers, Comic_Neue, Fredoka, Lilita_One, Luckiest_Guy, Patrick_Hand, Permanent_Marker, Titan_One } from "next/font/google";
import type { FontGaya } from "@/lib/editor/gaya-teks";

/** Huruf untuk gaya teks komik (semua berlisensi OFL, gratis). Dimuat sekali dan dipakai kanvas, ekspor PDF, dan penerbitan. */
const bangers = Bangers({ weight: "400", subsets: ["latin"], display: "swap" });
const luckiest = Luckiest_Guy({ weight: "400", subsets: ["latin"], display: "swap" });
const lilita = Lilita_One({ weight: "400", subsets: ["latin"], display: "swap" });
const titan = Titan_One({ weight: "400", subsets: ["latin"], display: "swap" });
const comic = Comic_Neue({ weight: ["400", "700"], subsets: ["latin"], display: "swap" });
const patrick = Patrick_Hand({ weight: "400", subsets: ["latin"], display: "swap" });
const marker = Permanent_Marker({ weight: "400", subsets: ["latin"], display: "swap" });
const fredoka = Fredoka({ weight: ["400", "600"], subsets: ["latin"], display: "swap" });

export const FONT_GAYA: Record<FontGaya, string> = {
  bangers: bangers.style.fontFamily,
  luckiest: luckiest.style.fontFamily,
  lilita: lilita.style.fontFamily,
  titan: titan.style.fontFamily,
  comic: comic.style.fontFamily,
  patrick: patrick.style.fontFamily,
  marker: marker.style.fontFamily,
  fredoka: fredoka.style.fontFamily,
};

/** Pastikan semua huruf gaya sudah termuat sebelum kanvas menggambar teks (kalau belum, kanvas memakai huruf cadangan). */
export async function muatFontGaya(): Promise<void> {
  await Promise.all(
    (Object.keys(FONT_GAYA) as FontGaya[]).map((k) => document.fonts.load(`${k === "comic" ? "bold " : ""}40px ${FONT_GAYA[k]}`, "Abc").catch(() => [])),
  );
}
