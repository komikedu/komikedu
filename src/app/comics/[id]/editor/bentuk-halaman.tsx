"use client";

import { Circle, Ellipse, Group, Image as KImage, Line, Rect, Shape, Text } from "react-konva";
import type Konva from "konva";
import { LEBAR_EKOR_BAWAAN, areaTeks, garisGerak, jalurKotak, jalurOval, lingkaranAwan, sisipkanEkor, titikGerigi } from "@/lib/editor/bentuk-balon";
import { burstTeks, gayaTeks, lapisanLanjut, titikBurst } from "@/lib/editor/gaya-teks";
import { irisanSinar, jajaranGaris, jariSinar, titikGradasi, titikHalftone } from "@/lib/editor/latar-panel";
import { layoutKumpulan } from "@/lib/editor/math-elements";
import { PAGE_H, PAGE_W, type Bubble, type EditorPage, type ElemenStiker, type ElemenTeks, type MathElement, type Panel } from "@/lib/editor/types";
import { FONT_GAYA } from "./font-gaya";
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

/** Pola latar panel (halftone, sinar, garis, gradasi) di koordinat lokal panel; digambar di bawah gambar dan di atas warna dasar. */
export function LatarPanel({ panel }: { panel: Panel }) {
  const latar = panel.latar;
  if (!latar) return null;
  const { w, h } = panel;
  return (
    <Shape
      listening={false}
      sceneFunc={(ctx) => {
        const c = (ctx as unknown as { _context: CanvasRenderingContext2D })._context;
        c.fillStyle = latar.warna1;
        c.fillRect(0, 0, w, h);
        if (latar.jenis === "gradasi") {
          const { mulai, akhir } = titikGradasi(w, h, latar.sudut);
          const g = c.createLinearGradient(mulai.x, mulai.y, akhir.x, akhir.y);
          g.addColorStop(0, latar.warna1);
          g.addColorStop(1, latar.warna2);
          c.fillStyle = g;
          c.fillRect(0, 0, w, h);
          return;
        }
        c.fillStyle = latar.warna2;
        c.beginPath();
        if (latar.jenis === "halftone" || latar.jenis === "halftone-pudar") {
          for (const t of titikHalftone(w, h, latar.ukuran, latar.sudut, latar.jenis === "halftone-pudar")) {
            c.moveTo(t.x + t.r, t.y);
            c.arc(t.x, t.y, t.r, 0, Math.PI * 2);
          }
        } else if (latar.jenis === "sinar") {
          const r = jariSinar(w, h);
          for (const s of irisanSinar(latar.ukuran, latar.sudut)) {
            c.moveTo(w / 2, h / 2);
            c.arc(w / 2, h / 2, r, s.dari, s.ke);
            c.closePath();
          }
        } else if (latar.jenis === "garis") {
          for (const poly of jajaranGaris(w, h, latar.ukuran, latar.sudut)) {
            c.moveTo(poly[0].x, poly[0].y);
            for (let i = 1; i < poly.length; i++) c.lineTo(poly[i].x, poly[i].y);
            c.closePath();
          }
        }
        c.fill();
      }}
    />
  );
}

/** Teks bergaya: lapisan garis tepi, bayangan, dan isi digambar dari belakang ke depan di kotak elemen. */
export function TeksGayaShape({ el }: { el: ElemenTeks }) {
  const g = gayaTeks(el.gaya);
  const burst = burstTeks(el);
  return (
    <>
      {burst && (
        <Shape
          listening={false}
          sceneFunc={(ctx) => {
            const c = (ctx as unknown as { _context: CanvasRenderingContext2D })._context;
            const poligon = titikBurst(el.w, el.h, burst.gerigi);
            const jalur = () => {
              c.beginPath();
              poligon.forEach((t, i) => (i ? c.lineTo(t.x, t.y) : c.moveTo(t.x, t.y)));
              c.closePath();
            };
            c.save();
            jalur();
            c.fillStyle = burst.isi;
            c.fill();
            c.clip();
            c.fillStyle = burst.titik;
            c.beginPath();
            for (const t of titikHalftone(el.w, el.h, Math.max(14, Math.min(el.w, el.h) / 12), 45, true)) {
              c.moveTo(t.x + t.r, t.y);
              c.arc(t.x, t.y, t.r, 0, Math.PI * 2);
            }
            c.fill();
            c.restore();
            jalur();
            c.lineJoin = "miter";
            c.lineWidth = Math.max(5, Math.min(el.w, el.h) / 40);
            c.strokeStyle = burst.tepi;
            c.stroke();
          }}
        />
      )}
      {lapisanLanjut(el).map((l, i) => (
        <Text
          key={i}
          x={l.dx ?? 0}
          y={l.dy ?? 0}
          width={el.w}
          height={el.h}
          text={el.text}
          align="center"
          verticalAlign="middle"
          wrap="word"
          fontFamily={FONT_GAYA[g.font]}
          fontStyle={g.font === "comic" ? "bold" : "normal"}
          fontSize={el.fontSize}
          fill={l.fill}
          stroke={l.stroke}
          strokeWidth={l.strokeWidth}
          fillAfterStrokeEnabled
          lineJoin="round"
          listening={false}
        />
      ))}
    </>
  );
}

/** Stiker: gambar muat utuh di kotaknya (tidak gepeng) dan berada di tengah. */
export function StikerShape({ el, img }: { el: ElemenStiker; img: HTMLImageElement | null | undefined }) {
  if (!img) return <Rect width={el.w} height={el.h} stroke="#9aa0aa" dash={[8, 6]} strokeWidth={2} listening={false} />;
  const s = Math.min(el.w / img.width, el.h / img.height);
  const w = img.width * s;
  const h = img.height * s;
  return <KImage image={img} x={(el.w - w) / 2} y={(el.h - h) / 2} width={w} height={h} listening={false} />;
}

/** Isi elemen di atas panel menurut jenisnya (tanpa pegangan seleksi). `img` dipakai stiker. */
export function IsiElemen({ e, img }: { e: MathElement; img?: HTMLImageElement | null }) {
  if (e.kind === "teks") return <TeksGayaShape el={e} />;
  if (e.kind === "stiker") return <StikerShape el={e} img={img} />;
  return (
    <>
      {layoutKumpulan(e).map((pos, i) => (
        <IkonBendaView key={i} ikon={e.ikon} x={pos.x} y={pos.y} size={pos.size} />
      ))}
    </>
  );
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

/** Ekor pikiran: dua lingkaran kecil menuju ujung ekor. */
function EkorPikir({ b }: { b: Bubble }) {
  if (!b.tail) return null;
  const cx = b.w / 2;
  const cy = b.h / 2;
  return (
    <>
      <Circle x={cx + b.tail.dx * 0.55} y={cy + b.tail.dy * 0.7} radius={11} fill="#fff" stroke="#111" strokeWidth={3} />
      <Circle x={cx + b.tail.dx} y={cy + b.tail.dy} radius={6} fill="#fff" stroke="#111" strokeWidth={3} />
    </>
  );
}

/** Satu garis tertutup: badan balon dengan ekor yang menyambung langsung di garis tepinya. */
function JalurBalon({ b, poligon, bayangan, runcing }: { b: Bubble; poligon: { x: number; y: number }[]; bayangan?: boolean; runcing?: boolean }) {
  const tail = b.tail;
  const titik = tail ? sisipkanEkor(poligon, { x: b.w / 2, y: b.h / 2 }, { x: b.w / 2 + tail.dx, y: b.h / 2 + tail.dy }, tail.lebar ?? LEBAR_EKOR_BAWAAN) : poligon;
  const datar = titik.flatMap((t) => [t.x, t.y]);
  return (
    <>
      {bayangan && <Line points={datar.map((v) => v + 7)} closed fill="#111" lineJoin="round" listening={false} />}
      <Line points={datar} closed fill="#fff" stroke="#111" strokeWidth={4} lineJoin={runcing ? "miter" : "round"} miterLimit={6} />
    </>
  );
}

/** Balon dengan bentuk pilihan; garis tepi dan ekor menyambung jadi satu, kecuali awan yang memakai lingkaran pikiran. */
function BalonBergaya({ b }: { b: Bubble }) {
  const bentuk = b.bentuk ?? "oval";

  if (bentuk === "awan") {
    const { lingkaran, tengah } = lingkaranAwan(b.w, b.h);
    return (
      <>
        <Shape
          listening={false}
          sceneFunc={(ctx) => {
            const c = (ctx as unknown as { _context: CanvasRenderingContext2D })._context;
            c.fillStyle = "#fff";
            c.strokeStyle = "#111";
            c.lineWidth = 8;
            for (const l of lingkaran) {
              c.beginPath();
              c.arc(l.x, l.y, l.r, 0, Math.PI * 2);
              c.stroke();
            }
            c.beginPath();
            c.ellipse(tengah.x, tengah.y, tengah.rx, tengah.ry, 0, 0, Math.PI * 2);
            c.stroke();
            for (const l of lingkaran) {
              c.beginPath();
              c.arc(l.x, l.y, l.r - 1, 0, Math.PI * 2);
              c.fill();
            }
            c.beginPath();
            c.ellipse(tengah.x, tengah.y, tengah.rx, tengah.ry, 0, 0, Math.PI * 2);
            c.fill();
          }}
        />
        <EkorPikir b={b} />
      </>
    );
  }
  if (bentuk === "kotak") return <JalurBalon b={b} poligon={jalurKotak(b.w, b.h)} bayangan />;
  if (bentuk === "ledakan") return <JalurBalon b={b} poligon={titikGerigi(b.w, b.h, 13, 0.62)} runcing />;
  if (bentuk === "teriak") return <JalurBalon b={b} poligon={titikGerigi(b.w, b.h, 22, 0.8)} runcing />;
  return (
    <>
      <JalurBalon b={b} poligon={jalurOval(b.w, b.h)} />
      {bentuk === "gerak" &&
        garisGerak(b.w, b.h).map((g, i) => <Line key={i} points={g} stroke="#111" strokeWidth={4} lineCap="round" listening={false} />)}
    </>
  );
}

export function BubbleShape({ b }: { b: Bubble }) {
  const cx = b.w / 2;
  const cy = b.h / 2;
  const tail = b.tail;

  if (b.kind === "narasi") {
    return <Rect width={b.w} height={b.h} fill="#fff6c8" stroke="#111" strokeWidth={4} cornerRadius={4} />;
  }
  if (b.kind === "pikir" && !b.bentuk) {
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
  return <BalonBergaya b={b} />;
}

/** Bentuk balon beserta teksnya (tanpa pegangan seleksi). */
export function IsiBalon({ b, fontFamily }: { b: Bubble; fontFamily: string }) {
  const pad = 14;
  const area = b.kind === "narasi" || !b.bentuk ? { x: pad, y: pad / 2, w: b.w - pad * 2, h: b.h - pad } : areaTeks(b.bentuk, b.w, b.h);
  return (
    <>
      <BubbleShape b={b} />
      <Text
        x={area.x}
        y={area.y}
        width={area.w}
        height={area.h}
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
              <LatarPanel panel={p} />
              {img && <GambarPanel panel={p} img={img} />}
              <TepiPanel panel={p} lokal={lokal} />
            </Group>
          );
        })}
      {page.elements
        .filter((e) => e.visible)
        .map((e) => (
          <Group key={e.id} x={e.x} y={e.y} rotation={e.rotasi ?? 0}>
            <IsiElemen e={e} img={e.kind === "stiker" ? gambar.get(e.url) : undefined} />
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
