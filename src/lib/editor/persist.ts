import { z } from "zod";
import { LAYOUTS } from "@/lib/ai/layouts";
import { PAGE_H, PAGE_W, type Bubble, type EditorPage, type Panel } from "./types";

export const MAX_PAGES = 30;
export const MAX_BUBBLES_PER_PAGE = 40;
export const MAX_BUBBLE_TEXT = 300;

const layoutIds = LAYOUTS.map((l) => l.id) as [string, ...string[]];
const coord = (max: number) => z.number().finite().min(-max).max(max * 2);

const PanelSchema = z.object({
  id: z.string().uuid(),
  x: coord(PAGE_W),
  y: coord(PAGE_H),
  w: z.number().finite().min(1).max(PAGE_W),
  h: z.number().finite().min(1).max(PAGE_H),
  visible: z.boolean(),
  /** deskripsi adegan untuk membuat gambar; bisa diedit guru di editor */
  adegan: z.string().max(1000),
  /** sudut panel miring; null/absen = panel kotak */
  corners: z
    .array(z.object({ x: coord(PAGE_W), y: coord(PAGE_H) }))
    .length(4)
    .nullable()
    .optional(),
});

const BubbleSchema = z.object({
  id: z.string().uuid(),
  panelId: z.string().uuid(),
  kind: z.enum(["bicara", "pikir", "narasi"]),
  text: z.string().max(MAX_BUBBLE_TEXT),
  x: coord(PAGE_W),
  y: coord(PAGE_H),
  w: z.number().finite().min(20).max(PAGE_W * 2),
  h: z.number().finite().min(20).max(PAGE_H * 2),
  tail: z.object({ dx: z.number().finite(), dy: z.number().finite() }).nullable(),
  fontSize: z.number().int().min(8).max(96),
  visible: z.boolean(),
});

/**
 * Payload dari klien. Sengaja TIDAK memuat image_url, status, dan script_json:
 * kolom itu hanya boleh diisi server (pipeline), bukan klien.
 */
export const EditorPayloadSchema = z
  .array(
    z.object({
      id: z.string().uuid(),
      layoutId: z.enum(layoutIds),
      panels: z.array(PanelSchema).min(1).max(12),
      bubbles: z.array(BubbleSchema).max(MAX_BUBBLES_PER_PAGE),
    }),
  )
  .min(1)
  .max(MAX_PAGES)
  .superRefine((pages, ctx) => {
    const seen = new Set<string>();
    pages.forEach((p, pi) => {
      const panelIds = new Set(p.panels.map((x) => x.id));
      for (const id of [p.id, ...p.panels.map((x) => x.id), ...p.bubbles.map((x) => x.id)]) {
        if (seen.has(id)) ctx.addIssue({ code: "custom", message: "id ganda", path: [pi] });
        seen.add(id);
      }
      p.bubbles.forEach((b, bi) => {
        if (!panelIds.has(b.panelId)) {
          ctx.addIssue({ code: "custom", message: "balon menunjuk panel di halaman lain", path: [pi, "bubbles", bi] });
        }
      });
    });
  });

export type EditorRows = {
  pages: { id: string; comic_id: string; urutan: number; template_layout: string }[];
  panels: { id: string; page_id: string; urutan: number; posisi: { x: number; y: number; w: number; h: number; corners?: { x: number; y: number }[] }; tampil: boolean; adegan: string }[];
  bubbles: {
    id: string;
    panel_id: string;
    jenis: string;
    teks: string;
    posisi: { x: number; y: number };
    ukuran: { w: number; h: number };
    ekor: { dx: number; dy: number } | null;
    font_size: number;
    tampil: boolean;
    urutan: number;
  }[];
};

/** Bagian halaman yang boleh disimpan dari klien (tanpa imageUrl dan adegan). */
export type SavablePage = {
  id: string;
  layoutId: string;
  panels: Pick<Panel, "id" | "x" | "y" | "w" | "h" | "visible" | "adegan" | "corners">[];
  bubbles: Bubble[];
};

export function toRows(comicId: string, pages: SavablePage[]): EditorRows {
  const rows: EditorRows = { pages: [], panels: [], bubbles: [] };
  pages.forEach((page, pi) => {
    rows.pages.push({ id: page.id, comic_id: comicId, urutan: pi + 1, template_layout: page.layoutId });
    page.panels.forEach((p, i) =>
      rows.panels.push({
        id: p.id,
        page_id: page.id,
        urutan: i + 1,
        posisi: { x: p.x, y: p.y, w: p.w, h: p.h, ...(p.corners ? { corners: p.corners } : {}) },
        tampil: p.visible,
        adegan: p.adegan,
      }),
    );
    page.bubbles.forEach((b, i) =>
      rows.bubbles.push({
        id: b.id,
        panel_id: b.panelId,
        jenis: b.kind,
        teks: b.text,
        posisi: { x: b.x, y: b.y },
        ukuran: { w: b.w, h: b.h },
        ekor: b.tail,
        font_size: b.fontSize,
        tampil: b.visible,
        urutan: i,
      }),
    );
  });
  return rows;
}

/** Bentuk hasil query bersarang: pages → panels → bubbles. */
export type NestedPage = {
  id: string;
  urutan: number;
  template_layout: string | null;
  panels: {
    id: string;
    urutan: number;
    script_json: { adegan?: string } | null;
    image_url: string | null;
    posisi: { x: number; y: number; w: number; h: number; corners?: { x: number; y: number }[] } | null;
    tampil: boolean;
    adegan: string | null;
    bubbles: {
      id: string;
      jenis: string;
      teks: string;
      posisi: { x: number; y: number } | null;
      ukuran: { w: number; h: number } | null;
      ekor: { dx: number; dy: number } | null;
      font_size: number;
      tampil: boolean;
      urutan: number;
    }[];
  }[];
};

export function fromNested(rows: NestedPage[]): EditorPage[] {
  return [...rows]
    .sort((a, b) => a.urutan - b.urutan)
    .map((page) => {
      const panels: Panel[] = [];
      const bubbles: (Bubble & { _o: number; _p: number })[] = [];
      [...page.panels]
        .sort((a, b) => a.urutan - b.urutan)
        .forEach((p, pIdx) => {
          const { corners, ...pos } = p.posisi ?? { x: 0, y: 0, w: PAGE_W, h: PAGE_H };
          panels.push({
            id: p.id,
            ...pos,
            ...(corners?.length === 4 ? { corners } : {}),
            imageUrl: p.image_url,
            visible: p.tampil,
            // kolom adegan (hasil edit di editor) didahulukan, lalu adegan asli dari naskah
            adegan: p.adegan ?? p.script_json?.adegan ?? "",
          });
          for (const b of p.bubbles) {
            bubbles.push({
              id: b.id,
              panelId: p.id,
              kind: b.jenis as Bubble["kind"],
              text: b.teks,
              x: b.posisi?.x ?? 0,
              y: b.posisi?.y ?? 0,
              w: b.ukuran?.w ?? 260,
              h: b.ukuran?.h ?? 130,
              tail: b.ekor,
              fontSize: b.font_size,
              visible: b.tampil,
              _o: b.urutan,
              _p: pIdx,
            });
          }
        });
      // urutan z balon: urutan tersimpan, lalu urutan panel sebagai pemutus
      bubbles.sort((a, b) => a._o - b._o || a._p - b._p);
      return {
        id: page.id,
        layoutId: page.template_layout ?? LAYOUTS[0].id,
        panels,
        bubbles: bubbles.map(({ _o, _p, ...b }) => {
          void _o;
          void _p;
          return b;
        }),
      };
    });
}
