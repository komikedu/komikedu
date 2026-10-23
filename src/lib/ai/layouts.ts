/** Persegi panjang ternormalisasi (0-1) relatif terhadap halaman. */
export type Rect = { x: number; y: number; w: number; h: number };

export type LayoutTemplate = {
  id: string;
  nama: string;
  panels: Rect[];
};

const G = 0.02; // jarak antar panel

/** Template layout halaman. Urutan panel = urutan baca (kiri ke kanan, atas ke bawah). */
export const LAYOUTS: LayoutTemplate[] = [
  {
    id: "1-penuh",
    nama: "Satu panel penuh",
    panels: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
  {
    id: "2-atas-bawah",
    nama: "Dua panel atas-bawah",
    panels: [
      { x: 0, y: 0, w: 1, h: 0.5 - G / 2 },
      { x: 0, y: 0.5 + G / 2, w: 1, h: 0.5 - G / 2 },
    ],
  },
  {
    id: "3-satu-atas-dua-bawah",
    nama: "Satu panel lebar di atas, dua panel di bawah",
    panels: [
      { x: 0, y: 0, w: 1, h: 0.5 - G / 2 },
      { x: 0, y: 0.5 + G / 2, w: 0.5 - G / 2, h: 0.5 - G / 2 },
      { x: 0.5 + G / 2, y: 0.5 + G / 2, w: 0.5 - G / 2, h: 0.5 - G / 2 },
    ],
  },
  {
    id: "3-tiga-baris",
    nama: "Tiga panel bersusun ke bawah",
    panels: [0, 1, 2].map((i) => ({
      x: 0,
      y: i * (1 / 3) + (i === 0 ? 0 : G / 2),
      w: 1,
      h: 1 / 3 - G * (i === 1 ? 1 : 0.5),
    })),
  },
  {
    id: "4-grid",
    nama: "Empat panel grid 2x2",
    panels: [
      { x: 0, y: 0, w: 0.5 - G / 2, h: 0.5 - G / 2 },
      { x: 0.5 + G / 2, y: 0, w: 0.5 - G / 2, h: 0.5 - G / 2 },
      { x: 0, y: 0.5 + G / 2, w: 0.5 - G / 2, h: 0.5 - G / 2 },
      { x: 0.5 + G / 2, y: 0.5 + G / 2, w: 0.5 - G / 2, h: 0.5 - G / 2 },
    ],
  },
  {
    id: "4-dua-lebar-dua-kecil",
    nama: "Dua panel lebar di atas dan bawah, dua panel kecil di tengah",
    panels: [
      { x: 0, y: 0, w: 1, h: 0.4 - G / 2 },
      { x: 0, y: 0.4 + G / 2, w: 0.5 - G / 2, h: 0.2 - G },
      { x: 0.5 + G / 2, y: 0.4 + G / 2, w: 0.5 - G / 2, h: 0.2 - G },
      { x: 0, y: 0.6 + G / 2, w: 1, h: 0.4 - G / 2 },
    ],
  },
  {
    id: "2-kiri-kanan",
    nama: "Dua panel tinggi berdampingan kiri-kanan",
    panels: [
      { x: 0, y: 0, w: 0.5 - G / 2, h: 1 },
      { x: 0.5 + G / 2, y: 0, w: 0.5 - G / 2, h: 1 },
    ],
  },
  {
    id: "3-dua-atas-satu-bawah",
    nama: "Dua panel di atas, satu panel lebar di bawah",
    panels: [
      { x: 0, y: 0, w: 0.5 - G / 2, h: 0.5 - G / 2 },
      { x: 0.5 + G / 2, y: 0, w: 0.5 - G / 2, h: 0.5 - G / 2 },
      { x: 0, y: 0.5 + G / 2, w: 1, h: 0.5 - G / 2 },
    ],
  },
  {
    id: "4-dua-baris-dua-bawah",
    nama: "Dua panel lebar bersusun, lalu dua panel kecil di bawah",
    panels: [
      { x: 0, y: 0, w: 1, h: 1 / 3 - G / 2 },
      { x: 0, y: 1 / 3 + G / 2, w: 1, h: 1 / 3 - G },
      { x: 0, y: 2 / 3 + G / 2, w: 0.5 - G / 2, h: 1 / 3 - G / 2 },
      { x: 0.5 + G / 2, y: 2 / 3 + G / 2, w: 0.5 - G / 2, h: 1 / 3 - G / 2 },
    ],
  },
];

export const isLayoutId = (id: unknown): id is string => typeof id === "string" && LAYOUTS.some((l) => l.id === id);

export function getLayout(id: string): LayoutTemplate {
  const layout = LAYOUTS.find((l) => l.id === id);
  if (!layout) throw new Error(`Template layout tidak dikenal: ${id}`);
  return layout;
}

/** Pilih template pertama yang jumlah panelnya cocok. */
export function layoutForPanelCount(count: number): LayoutTemplate {
  const layout = LAYOUTS.find((l) => l.panels.length === count);
  if (!layout) throw new Error(`Tidak ada template untuk ${count} panel`);
  return layout;
}
