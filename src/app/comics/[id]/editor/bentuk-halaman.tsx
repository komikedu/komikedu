"use client";

import { Circle, Ellipse, Group, Image as KImage, Line, Rect, Text } from "react-konva";
import type Konva from "konva";
import { layoutKumpulan } from "@/lib/editor/math-elements";
import { PAGE_H, PAGE_W, type Bubble, type EditorPage, type Panel } from "@/lib/editor/types";
import { IkonBendaView } from "./ikon-benda";

/**
 * Bagian gambar halaman yang dipakai bersama oleh kanvas editor (interaktif) dan ekspor PDF (statis),
 * supaya hasil ekspor persis sama dengan yang terlihat di editor.
 */

/** Potongan gambar agar memenuhi panel tanpa gepeng (seperti CSS object-fit: cover). */
export function coverCrop(img: HTMLImageElement, w: number, h: number) {
  const ir = img.width / img.height;
  const pr = w / h;
  return ir > pr
    ? { x: (img.width - img.height * pr) / 2, y: 0, width: img.height * pr, height: img.height }
    : { x: 0, y: (img.height - img.width / pr) / 2, width: img.width, height: img.width / pr };
}

/** Titik sudut panel miring relatif terhadap pojok kotak pembatasnya; null untuk panel kotak biasa. */
export function titikLokal(panel: Panel): number[] | null {
  return panel.corners ? panel.corners.flatMap((c) => [c.x - panel.x, c.y - panel.y]) : null;
}

/** Properti klip Group untuk panel: poligon bila miring, kotak bila biasa. */
export function klipPanel(panel: Panel, lokal: number[] | null) {
  return lokal
    ? {
        clipFunc: (ctx: Konva.Context) => {
          ctx.beginPath();
          ctx.moveTo(lokal[0], lokal[1]);
          for (let i = 2; i < lokal.length; i += 2) ctx.lineTo(lokal[i], lokal[i + 1]);
          ctx.closePath();
        },
      }
    : { clipX: 0, clipY: 0, clipWidth: panel.w, clipHeight: panel.h };
}

/** Gambar panel: posisi yang diatur guru, atau otomatis memenuhi panel. */
export function GambarPanel({ panel, img, rect }: { panel: Panel; img: HTMLImageElement; rect?: { x: number; y: number; w: number; h: number } | null }) {
  const r = rect ?? panel.imageRect;
  return r ? (
    <KImage image={img} x={r.x - panel.x} y={r.y - panel.y} width={r.w} height={r.h} />
  ) : (
    <KImage image={img} width={panel.w} height={panel.h} crop={coverCrop(img, panel.w, panel.h)} />
  );
}

/** Garis tepi panel. */
export function TepiPanel({ panel, lokal }: { panel: Panel; lokal: number[] | null }) {
  return lokal ? (
    <Line points={lokal} closed stroke="#111" strokeWidth={6} lineJoin="miter" listening={false} />
  ) : (
    <Rect width={panel.w} height={panel.h} stroke="#111" strokeWidth={6} listening={false} />
  );
}

export function BubbleShape({ b }: { b: Bubble }) {
  const cx = b.w / 2;
  const cy = b.h / 2;
  const tail = b.tail;

  // segitiga ekor: dua titik di tepi balon searah ujung ekor, ujungnya di titik ekor
  let tailPoints: number[] | null = null;
  if (tail && b.kind === "bicara") {
    const len = Math.hypot(tail.dx, tail.dy) || 1;
    const ux = tail.dx / len;
    const uy = tail.dy / len;
    const bx = cx + ux * cx * 0.75;
    const by = cy + uy * cy * 0.75;
    const px = -uy * 18;
    const py = ux * 18;
    tailPoints = [bx + px, by + py, cx + tail.dx, cy + tail.dy, bx - px, by - py];
  }

  if (b.kind === "narasi") {
    return <Rect width={b.w} height={b.h} fill="#fff6c8" stroke="#111" strokeWidth={4} cornerRadius={4} />;
  }
  if (b.kind === "pikir") {
    return (
      <>
        <Rect width={b.w} height={b.h} fill="#fff" stroke="#111" strokeWidth={4} cornerRadius={Math.min(b.w, b.h) / 2} />
        {tail && (
          <>
            <Circle x={cx + tail.dx * 0.55} y={cy + tail.dy * 0.7} radius={11} fill="#fff" stroke="#111" strokeWidth={3} />
            <Circle x={cx + tail.dx} y={cy + tail.dy} radius={6} fill="#fff" stroke="#111" strokeWidth={3} />
          </>
        )}
      </>
    );
  }
  return (
    <>
      {tailPoints && <Line points={tailPoints} closed fill="#fff" stroke="#111" strokeWidth={4} lineJoin="round" />}
      <Ellipse x={cx} y={cy} radiusX={cx} radiusY={cy} fill="#fff" stroke="#111" strokeWidth={4} />
      {tailPoints && <Line points={tailPoints.slice(0, 2).concat(tailPoints.slice(4))} stroke="#fff" strokeWidth={6} listening={false} />}
    </>
  );
}

/** Bentuk balon beserta teksnya (tanpa pegangan seleksi). */
export function IsiBalon({ b, fontFamily }: { b: Bubble; fontFamily: string }) {
  const pad = 14;
  return (
    <>
      <BubbleShape b={b} />
      <Text
        x={pad}
        y={pad / 2}
        width={b.w - pad * 2}
        height={b.h - pad}
        text={b.text}
        align="center"
        verticalAlign="middle"
        fontSize={b.fontSize}
        fontFamily={fontFamily}
        fontStyle="bold"
        fill="#111"
        wrap="word"
        listening={false}
      />
    </>
  );
}

/**
 * Satu halaman dalam bentuk statis (tanpa seleksi dan interaksi) untuk ekspor. Urutan lapisan sama dengan editor:
 * panel, elemen mat, lalu balon. Panel tanpa gambar digambar polos tanpa tulisan penanda.
 */
export function HalamanStatis({ page, gambar, fontFamily }: { page: EditorPage; gambar: Map<string, HTMLImageElement>; fontFamily: string }) {
  return (
    <>
      <Rect width={PAGE_W} height={PAGE_H} fill="#ffffff" />
      {page.panels
        .filter((p) => p.visible)
        .map((p) => {
          const lokal = titikLokal(p);
          const img = p.imageUrl ? gambar.get(p.imageUrl) : undefined;
          return (
            <Group key={p.id} x={p.x} y={p.y} {...klipPanel(p, lokal)}>
              <Rect width={p.w} height={p.h} fill="#eef0f3" />
              {img && <GambarPanel panel={p} img={img} />}
              <TepiPanel panel={p} lokal={lokal} />
            </Group>
          );
        })}
      {page.elements
        .filter((e) => e.visible)
        .map((e) => (
          <Group key={e.id} x={e.x} y={e.y}>
            {layoutKumpulan(e).map((pos, i) => (
              <IkonBendaView key={i} ikon={e.ikon} x={pos.x} y={pos.y} size={pos.size} />
            ))}
          </Group>
        ))}
      {page.bubbles
        .filter((b) => b.visible)
        .map((b) => (
          <Group key={b.id} x={b.x} y={b.y}>
            <IsiBalon b={b} fontFamily={fontFamily} />
          </Group>
        ))}
    </>
  );
}
