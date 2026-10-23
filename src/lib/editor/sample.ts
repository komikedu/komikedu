import { createBubble, createPage } from "./factory";
import type { EditorPage } from "./types";

/** Data contoh untuk pratinjau editor, sebelum tersambung ke naskah dan gambar hasil AI. */
export function samplePages(): EditorPage[] {
  const p1 = createPage("3-satu-atas-dua-bawah", [
    "Kiki dan Doni berdiri di depan toko kue yang ramai, dua utas lampu hias berkelap-kelip.",
    "Close-up Kiki berpikir sambil menunjuk lampu merah yang menyala.",
    "Close-up Doni tersenyum paham sambil mengacungkan jempol.",
  ]);
  const [a, b, c] = p1.panels;
  a.imageUrl = "/landing/halaman-contoh.webp"; // contoh gambar untuk mencoba mode edit gambar
  p1.bubbles = [
    createBubble(a.id, "bicara", a.x + 230, a.y + 80, "Lampu merah menyala tiap 4 detik, lampu biru tiap 6 detik."),
    createBubble(b.id, "bicara", b.x + b.w / 2, b.y + 90, "Kapan kedua lampu menyala bersamaan?"),
    createBubble(c.id, "bicara", c.x + c.w / 2, c.y + 90, "Cari KPK dari 4 dan 6!"),
  ];
  p1.bubbles[0].w = 330;
  p1.bubbles[0].h = 150;
  return [p1];
}
