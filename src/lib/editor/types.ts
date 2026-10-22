/** Ukuran halaman dalam unit kanvas (rasio 3:4). Semua koordinat editor memakai unit ini. */
export const PAGE_W = 900;
export const PAGE_H = 1200;

export type BubbleKind = "bicara" | "pikir" | "narasi";

export type Bubble = {
  id: string;
  panelId: string;
  kind: BubbleKind;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Ujung ekor relatif terhadap pusat balon. null = tanpa ekor. */
  tail: { dx: number; dy: number } | null;
  fontSize: number;
  visible: boolean;
};

export type Panel = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  imageUrl: string | null;
  visible: boolean;
  /** Deskripsi adegan dari naskah yang sudah disetujui. */
  adegan: string;
};

export type EditorPage = {
  id: string;
  layoutId: string;
  panels: Panel[];
  bubbles: Bubble[];
};
