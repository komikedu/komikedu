import { z } from "zod";
import { LAYOUTS } from "@/lib/ai/layouts";
import { PAGE_H, PAGE_W, type Bubble, type EditorPage, type MathElement, type Panel } from "./types";

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
  /** id panel asal bila ini salinan yang gambarnya harus disalin server */
  salinanDari: z.string().uuid().optional(),
  /** deskripsi adegan untuk membuat gambar; bisa diedit guru di editor */
  adegan: z.string().max(1000),
  /** sudut panel miring; null/absen = panel kotak */
  corners: z
    .array(z.object({ x: coord(PAGE_W), y: coord(PAGE_H) }))
    .length(4)
    .nullable()
    .optional(),
  /** posisi gambar yang diatur guru; null/absen = otomatis memenuhi panel */
  imageRect: z
    .object({
      x: z.number().finite().min(-PAGE_W).max(PAGE_W * 2),
      y: z.number().finite().min(-PAGE_H).max(PAGE_H * 2),
      w: z.number().finite().min(1).max(PAGE_W * 3),
      h: z.number().finite().min(1).max(PAGE_H * 3),
    })
    .nullable()
    .optional(),
});

const ElementSchema = z.object({
  id: z.string().uuid(),
  panelId: z.string().uuid(),
  kind: z.literal("kumpulan"),
  x: coord(PAGE_W),
  y: coord(PAGE_H),
  w: z.number().finite().min(20).max(PAGE_W * 2),
  h: z.number().finite().min(20).max(PAGE_H * 2),
  ikon: z.enum(["apel", "jeruk", "kue", "bintang", "kelereng", "pensil"]),
  jumlah: z.number().int().min(1).max(100),
  kolom: z.number().int().min(1).max(20),
  visible: z.boolean(),
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
      elements: z.array(ElementSchema).max(30).default([]),
    }),
  )
  .min(1)
  .max(MAX_PAGES)
  .superRefine((pages, ctx) => {
    const seen = new Set<string>();
    pages.forEach((p, pi) => {
      const panelIds = new Set(p.panels.map((x) => x.id));
      for (const id of [p.id, ...p.panels.map((x) => x.id), ...p.bubbles.map((x) => x.id), ...p.elements.map((x) => x.id)]) {
        if (seen.has(id)) ctx.addIssue({ code: "custom", message: "id ganda", path: [pi] });
        seen.add(id);
      }
      p.bubbles.forEach((b, bi) => {
        if (!panelIds.has(b.panelId)) {
          ctx.addIssue({ code: "custom", message: "balon menunjuk panel di halaman lain", path: [pi, "bubbles", bi] });
        }
      });
      p.elements.forEach((e, ei) => {
        if (!panelIds.has(e.panelId)) {
          ctx.addIssue({ code: "custom", message: "elemen menunjuk panel di halaman lain", path: [pi, "elements", ei] });
        }
      });
    });
  });

export type EditorRows = {
  pages: { id: string; comic_id: string; urutan: number; template_layout: string }[];
  panels: { id: string; page_id: string; urutan: number; posisi: { x: number; y: number; w: number; h: number; corners?: { x: number; y: number }[]; gambar?: { x: number; y: number; w: number; h: number } };
    tampil: boolean;
    adegan: string;
    math_elements_json: ElementRow[];
  }[];
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
  panels: Pick<Panel, "id" | "x" | "y" | "w" | "h" | "visible" | "adegan" | "corners" | "imageRect">[];
  bubbles: Bubble[];
  elements: MathElement[];
};

/** Elemen matematika disimpan per panel di kolom panels.math_elements_json. */
export type ElementRow = Omit<MathElement, "panelId" | "visible"> & { tampil: boolean };

export function toRows(comicId: string, pages: SavablePage[]): EditorRows {
  const rows: EditorRows = { pages: [], panels: [], bubbles: [] };
  pages.forEach((page, pi) => {
    rows.pages.push({ id: page.id, comic_id: comicId, urutan: pi + 1, template_layout: page.layoutId });
    page.panels.forEach((p, i) =>
      rows.panels.push({
        id: p.id,
        page_id: page.id,
        urutan: i + 1,
        posisi: { x: p.x, y: p.y, w: p.w, h: p.h, ...(p.corners ? { corners: p.corners } : {}), ...(p.imageRect ? { gambar: p.imageRect } : {}) },
        tampil: p.visible,
        adegan: p.adegan,
        math_elements_json: page.elements
          .filter((e) => e.panelId === p.id)
          .map(({ panelId: _p, visible, ...e }) => {
            void _p;
            return { ...e, tampil: visible };
          }),
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
    posisi: { x: number; y: number; w: number; h: number; corners?: { x: number; y: number }[]; gambar?: { x: number; y: number; w: number; h: number } } | null;
    tampil: boolean;
    adegan: string | null;
    math_elements_json?: ElementRow[] | null;
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
      const elements: MathElement[] = [];
      const bubbles: (Bubble & { _o: number; _p: number })[] = [];
      [...page.panels]
        .sort((a, b) => a.urutan - b.urutan)
        .forEach((p, pIdx) => {
          const { corners, gambar, ...pos } = p.posisi ?? { x: 0, y: 0, w: PAGE_W, h: PAGE_H };
          panels.push({
            id: p.id,
            ...pos,
            ...(corners?.length === 4 ? { corners } : {}),
            ...(gambar ? { imageRect: gambar } : {}),
            imageUrl: p.image_url,
            visible: p.tampil,
            // kolom adegan (hasil edit di editor) didahulukan, lalu adegan asli dari naskah
            adegan: p.adegan ?? p.script_json?.adegan ?? "",
          });
          for (const { tampil, ...e } of p.math_elements_json ?? []) elements.push({ ...e, panelId: p.id, visible: tampil });
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
        elements,
        bubbles: bubbles.map(({ _o, _p, ...b }) => {
          void _o;
          void _p;
          return b;
        }),
      };
    });
}

/** Panel salinan (hasil duplikat panel atau halaman) yang gambarnya harus disalin server dari panel asal. */
export function panelSalinan(pages: { panels: { id: string; salinanDari?: string }[] }[]): { id: string; dari: string }[] {
  return pages.flatMap((pg) => pg.panels.filter((p) => p.salinanDari && p.salinanDari !== p.id).map((p) => ({ id: p.id, dari: p.salinanDari! })));
}
