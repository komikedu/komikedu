import { z } from "zod";
import { LAYOUTS } from "@/lib/ai/layouts";
import { BENTUK_BALON } from "./bentuk-balon";
import { FONT_MAX, FONT_MIN, GAYA_TEKS, MAKS_TEKS } from "./gaya-teks";
import { SISI_MAKS } from "./ukuran-halaman";
import { UKURAN_BAWAAN, type Bubble, type BentukBalon, type EditorPage, type GayaBalon, type Latar, type MathElement, type Panel, type UkuranHalaman } from "./types";

export const MAX_PAGES = 30;
export const MAX_BUBBLES_PER_PAGE = 40;
export const MAX_BUBBLE_TEXT = 300;

const layoutIds = LAYOUTS.map((l) => l.id) as [string, ...string[]];
const coord = (max: number) => z.number().finite().min(-max).max(max * 2);

const GayaBalonSchema = z.object({
  mode: z.enum(["teks", "kotak", "balon"]).optional(),
  font: z.string().max(20).optional(),
  tebal: z.boolean().optional(),
  miring: z.boolean().optional(),
  rata: z.enum(["left", "center", "right"]).optional(),
  vertikal: z.boolean().optional(),
  warnaTeks: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  warnaLatar: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  tebalGaris: z.number().finite().min(0).max(30).optional(),
  warnaGaris: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  rotasi: z.number().finite().min(-360).max(360).optional(),
  stroke: z.boolean().optional(),
  tebalStroke: z.number().finite().min(0).max(30).optional(),
  warnaStroke: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  radius: z.number().finite().min(0).max(100).optional(),
  ekor: z.enum(["lancip", "pikir"]).optional(),
});

const BENTUK_VALID = new Set<string>(BENTUK_BALON.map((b) => b.id));

const WARNA = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const LatarSchema = z.object({
  jenis: z.enum(["polos", "halftone", "halftone-pudar", "sinar", "garis", "gradasi"]),
  warna1: WARNA,
  warna2: WARNA,
  ukuran: z.number().finite().min(0).max(200),
  sudut: z.number().finite().min(0).max(360),
});

const PanelSchema = z.object({
  id: z.string().uuid(),
  x: coord(SISI_MAKS),
  y: coord(SISI_MAKS),
  w: z.number().finite().min(1).max(SISI_MAKS),
  h: z.number().finite().min(1).max(SISI_MAKS),
  visible: z.boolean(),
  /** id panel asal bila ini salinan yang gambarnya harus disalin server */
  salinanDari: z.string().uuid().optional(),
  /** deskripsi adegan untuk membuat gambar; bisa diedit guru di editor */
  adegan: z.string().max(1000),
  /** sudut panel miring; null/absen = panel kotak */
  corners: z
    .array(z.object({ x: coord(SISI_MAKS), y: coord(SISI_MAKS) }))
    .length(4)
    .nullable()
    .optional(),
  /** posisi gambar yang diatur guru; null/absen = otomatis memenuhi panel */
  imageRect: z
    .object({
      x: z.number().finite().min(-SISI_MAKS).max(SISI_MAKS * 2),
      y: z.number().finite().min(-SISI_MAKS).max(SISI_MAKS * 2),
      w: z.number().finite().min(1).max(SISI_MAKS * 3),
      h: z.number().finite().min(1).max(SISI_MAKS * 3),
    })
    .nullable()
    .optional(),
  /** pola latar panel; null/absen = tanpa pola */
  latar: LatarSchema.nullable().optional(),
});

const elemenDasar = {
  id: z.string().uuid(),
  panelId: z.string().uuid().nullable(),
  x: coord(SISI_MAKS),
  y: coord(SISI_MAKS),
  w: z.number().finite().min(20).max(SISI_MAKS * 2),
  h: z.number().finite().min(20).max(SISI_MAKS * 2),
  rotasi: z.number().finite().min(-360).max(360).optional(),
  visible: z.boolean(),
};

const ElementSchema = z.discriminatedUnion("kind", [
  z.object({
    ...elemenDasar,
    kind: z.literal("kumpulan"),
    ikon: z.enum(["apel", "jeruk", "kue", "bintang", "kelereng", "pensil"]),
    jumlah: z.number().int().min(1).max(100),
    kolom: z.number().int().min(1).max(20),
  }),
  z.object({
    ...elemenDasar,
    kind: z.literal("teks"),
    text: z.string().max(MAKS_TEKS),
    gaya: z.enum(GAYA_TEKS.map((g) => g.id) as [string, ...string[]]),
    fontSize: z.number().int().min(FONT_MIN).max(FONT_MAX),
    warna: WARNA.optional(),
    latarBurst: z.boolean().optional(),
    tebalTepi: z.number().finite().min(0).max(4).optional(),
    warnaTepi: WARNA.optional(),
    bayanganJarak: z.number().finite().min(0).max(60).optional(),
    bayanganTebal: z.number().finite().min(0).max(80).optional(),
    warnaBayangan: WARNA.optional(),
  }),
  z.object({
    ...elemenDasar,
    kind: z.literal("stiker"),
    url: z.string().url().max(1000),
  }),
]);

const BubbleSchema = z.object({
  id: z.string().uuid(),
  panelId: z.string().uuid(),
  kind: z.enum(["bicara", "pikir", "narasi"]),
  bentuk: z.enum(["oval", "kotak", "awan", "ledakan", "teriak", "gerak"]).optional(),
  gaya: GayaBalonSchema.optional(),
  text: z.string().max(MAX_BUBBLE_TEXT),
  x: coord(SISI_MAKS),
  y: coord(SISI_MAKS),
  w: z.number().finite().min(20).max(SISI_MAKS * 2),
  h: z.number().finite().min(20).max(SISI_MAKS * 2),
  tail: z.object({ dx: z.number().finite(), dy: z.number().finite(), lebar: z.number().finite().min(8).max(300).optional() }).nullable(),
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
        if (e.panelId !== null && !panelIds.has(e.panelId)) {
          ctx.addIssue({ code: "custom", message: "elemen menunjuk panel di halaman lain", path: [pi, "elements", ei] });
        }
      });
    });
  });

export type EditorRows = {
  pages: { id: string; comic_id: string; urutan: number; template_layout: string; elemen_bebas: ElementRow[] }[];
  panels: { id: string; page_id: string; urutan: number; posisi: { x: number; y: number; w: number; h: number; corners?: { x: number; y: number }[]; gambar?: { x: number; y: number; w: number; h: number }; latar?: Latar };
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
    ukuran: { w: number; h: number; bentuk?: BentukBalon; gaya?: GayaBalon };
    ekor: { dx: number; dy: number; lebar?: number } | null;
    font_size: number;
    tampil: boolean;
    urutan: number;
  }[];
};

/** Bagian halaman yang boleh disimpan dari klien (tanpa imageUrl dan adegan). */
export type SavablePage = {
  id: string;
  layoutId: string;
  panels: Pick<Panel, "id" | "x" | "y" | "w" | "h" | "visible" | "adegan" | "corners" | "imageRect" | "latar">[];
  bubbles: Bubble[];
  elements: MathElement[];
};

/** Elemen matematika disimpan per panel di kolom panels.math_elements_json. */
type TanpaPanel<E> = E extends unknown ? Omit<E, "panelId" | "visible"> : never;
export type ElementRow = TanpaPanel<MathElement> & { tampil: boolean };

function barisElemen(e: MathElement): ElementRow {
  const { panelId: _p, visible, ...sisa } = e;
  void _p;
  return { ...sisa, tampil: visible } as ElementRow;
}

export function toRows(comicId: string, pages: SavablePage[]): EditorRows {
  const rows: EditorRows = { pages: [], panels: [], bubbles: [] };
  pages.forEach((page, pi) => {
    rows.pages.push({
      id: page.id,
      comic_id: comicId,
      urutan: pi + 1,
      template_layout: page.layoutId,
      elemen_bebas: page.elements.filter((e) => e.panelId === null).map(barisElemen),
    });
    page.panels.forEach((p, i) =>
      rows.panels.push({
        id: p.id,
        page_id: page.id,
        urutan: i + 1,
        posisi: { x: p.x, y: p.y, w: p.w, h: p.h, ...(p.corners ? { corners: p.corners } : {}), ...(p.imageRect ? { gambar: p.imageRect } : {}), ...(p.latar ? { latar: p.latar } : {}) },
        tampil: p.visible,
        adegan: p.adegan,
        math_elements_json: page.elements.filter((e) => e.panelId === p.id).map(barisElemen),
      }),
    );
    page.bubbles.forEach((b, i) =>
      rows.bubbles.push({
        id: b.id,
        panel_id: b.panelId,
        jenis: b.kind,
        teks: b.text,
        posisi: { x: b.x, y: b.y },
        ukuran: { w: b.w, h: b.h, ...(b.bentuk ? { bentuk: b.bentuk } : {}), ...(b.gaya ? { gaya: b.gaya } : {}) },
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
  elemen_bebas?: ElementRow[] | null;
  panels: {
    id: string;
    urutan: number;
    script_json: { adegan?: string } | null;
    image_url: string | null;
    posisi: { x: number; y: number; w: number; h: number; corners?: { x: number; y: number }[]; gambar?: { x: number; y: number; w: number; h: number }; latar?: unknown } | null;
    tampil: boolean;
    adegan: string | null;
    math_elements_json?: ElementRow[] | null;
    bubbles: {
      id: string;
      jenis: string;
      teks: string;
      posisi: { x: number; y: number } | null;
      ukuran: { w: number; h: number; bentuk?: string; gaya?: unknown } | null;
      ekor: { dx: number; dy: number; lebar?: number } | null;
      font_size: number;
      tampil: boolean;
      urutan: number;
    }[];
  }[];
};

/** Halaman editor dari baris database; `ukuran` adalah ukuran kanvas komiknya (kolom komik, bukan halaman). */
export function fromNested(rows: NestedPage[], ukuran: UkuranHalaman = UKURAN_BAWAAN): EditorPage[] {
  return [...rows]
    .sort((a, b) => a.urutan - b.urutan)
    .map((page) => {
      const panels: Panel[] = [];
      const elements: MathElement[] = [];
      const bubbles: (Bubble & { _o: number; _p: number })[] = [];
      for (const { tampil, ...e } of page.elemen_bebas ?? []) elements.push({ ...e, panelId: null, visible: tampil } as MathElement);
      [...page.panels]
        .sort((a, b) => a.urutan - b.urutan)
        .forEach((p, pIdx) => {
          const { corners, gambar, latar, ...pos } = p.posisi ?? { x: 0, y: 0, w: ukuran.w, h: ukuran.h };
          panels.push({
            id: p.id,
            ...pos,
            ...(corners?.length === 4 ? { corners } : {}),
            ...(gambar ? { imageRect: gambar } : {}),
            ...(LatarSchema.safeParse(latar).success ? { latar: latar as Latar } : {}),
            imageUrl: p.image_url,
            visible: p.tampil,
            // kolom adegan (hasil edit di editor) didahulukan, lalu adegan asli dari naskah
            adegan: p.adegan ?? p.script_json?.adegan ?? "",
          });
          for (const { tampil, ...e } of p.math_elements_json ?? []) elements.push({ ...e, panelId: p.id, visible: tampil } as MathElement);
          for (const b of p.bubbles) {
            bubbles.push({
              id: b.id,
              panelId: p.id,
              kind: b.jenis as Bubble["kind"],
              ...(BENTUK_VALID.has(b.ukuran?.bentuk ?? "") ? { bentuk: b.ukuran!.bentuk as BentukBalon } : {}),
              ...(GayaBalonSchema.safeParse(b.ukuran?.gaya).success && b.ukuran?.gaya ? { gaya: b.ukuran.gaya as GayaBalon } : {}),
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
        w: ukuran.w,
        h: ukuran.h,
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
