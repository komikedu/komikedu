"use client";

import { useEffect, useRef, useState } from "react";
import { Circle, Ellipse, Group, Image as KImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import type Konva from "konva";
import { Check, Columns2, Copy, Maximize, Rows2, Shapes, Square, Trash2 } from "lucide-react";
import { MAX_PANELS_PER_PAGE, coverRect, panelCorners } from "@/lib/editor/panel-ops";
import { snapPoint, snapRectMove, snapTargets, type Guides, type SnapTargets } from "@/lib/editor/snap";
import { layoutKumpulan } from "@/lib/editor/math-elements";
import { IkonBendaView } from "./ikon-benda";
import { useEditor } from "@/lib/editor/store";
import { PAGE_H, PAGE_W, type Bubble, type MathElement, type Panel, type Point } from "@/lib/editor/types";

const FIT_PADDING = 48;

function useImage(url: string | null) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) return;
    const el = new window.Image();
    el.crossOrigin = "anonymous";
    el.onload = () => setImg(el);
    el.src = url;
    return () => {
      el.onload = null;
      setImg(null);
    };
  }, [url]);
  return url ? img : null;
}

/** Potongan gambar agar memenuhi panel tanpa gepeng (seperti CSS object-fit: cover). */
function coverCrop(img: HTMLImageElement, w: number, h: number) {
  const ir = img.width / img.height;
  const pr = w / h;
  return ir > pr
    ? { x: (img.width - img.height * pr) / 2, y: 0, width: img.height * pr, height: img.height }
    : { x: 0, y: (img.height - img.width / pr) / 2, width: img.width, height: img.width / pr };
}

function PanelView({
  panel,
  index,
  selected,
  tool,
  onSelect,
  onTextTool,
  onDragState,
  trRef,
  generating,
  cornerMode,
  imageMode,
  liveImage,
  snapTh,
  onGuides,
}: {
  panel: Panel;
  index: number;
  generating: boolean;
  cornerMode: boolean;
  /** layer gambar panel ini sedang diedit */
  imageMode: boolean;
  /** posisi gambar sementara saat sedang diseret/diubah ukurannya */
  liveImage: { x: number; y: number; w: number; h: number } | null;
  snapTh: number;
  onGuides: (g: Guides | null) => void;
  selected: boolean;
  tool: "move" | "text" | "mat";
  onSelect: () => void;
  onTextTool: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDragState: (dragging: boolean) => void;
  trRef: React.RefObject<Konva.Transformer | null>;
}) {
  const img = useImage(panel.imageUrl);
  const ref = useRef<Konva.Group>(null);
  const setDrag = useEditor((s) => s.setDrag);
  const movePanel = useEditor((s) => s.movePanel);
  const resizePanel = useEditor((s) => s.resizePanel);
  const targets = useRef<SnapTargets | null>(null);
  const selectImage = useEditor((s) => s.selectImage);

  useEffect(() => {
    if (selected && !cornerMode && !imageMode && ref.current && trRef.current) {
      trRef.current.nodes([ref.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selected, cornerMode, imageMode, trRef, panel.w, panel.h, panel.x, panel.y]);

  if (!panel.visible) return null;
  // titik-titik poligon relatif terhadap pojok kotak pembatas (posisi grup)
  const lokal = panel.corners ? panel.corners.flatMap((c) => [c.x - panel.x, c.y - panel.y]) : null;
  const clip = lokal
    ? {
        clipFunc: (ctx: Konva.Context) => {
          ctx.beginPath();
          ctx.moveTo(lokal[0], lokal[1]);
          for (let i = 2; i < lokal.length; i += 2) ctx.lineTo(lokal[i], lokal[i + 1]);
          ctx.closePath();
        },
      }
    : { clipX: 0, clipY: 0, clipWidth: panel.w, clipHeight: panel.h };
  // alat Teks dan Elemen Mat menaruh objek baru di titik klik; alat Pilih memilih panel
  const klik = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => (tool === "move" ? onSelect() : onTextTool(e));

  return (
    <Group
      ref={ref}
      x={panel.x}
      y={panel.y}
      {...clip}
      // panel baru bisa diseret setelah dipilih, supaya klik biasa tidak menggesernya tanpa sengaja
      draggable={tool === "move" && selected && !cornerMode && !imageMode}
      onClick={klik}
      onTap={klik}
      onDblClick={() => panel.imageUrl && tool === "move" && selectImage(panel.id)}
      onDblTap={() => panel.imageUrl && tool === "move" && selectImage(panel.id)}
      onDragStart={() => {
        onDragState(true);
        const st = useEditor.getState();
        const page = st.pages.find((p) => p.id === st.activePageId);
        targets.current = page ? snapTargets(page, panel.id) : null;
      }}
      onDragMove={(e) => {
        const node = e.target;
        // tempelkan tepi panel ke garis terdekat (tepi panel lain, celah seragam, margin halaman)
        if (targets.current) {
          const snap = snapRectMove({ x: node.x(), y: node.y(), w: panel.w, h: panel.h }, targets.current, snapTh);
          node.position({ x: node.x() + snap.dx, y: node.y() + snap.dy });
          onGuides(snap.guides);
        }
        setDrag({ panelId: panel.id, dx: node.x() - panel.x, dy: node.y() - panel.y });
      }}
      onDragEnd={(e) => {
        onDragState(false);
        onGuides(null);
        let { x, y } = { x: e.target.x(), y: e.target.y() };
        // posisi saat tombol dilepas juga ditempelkan (gerakan terakhir bisa saja belum masuk jarak tempel)
        if (targets.current) {
          const snap = snapRectMove({ x, y, w: panel.w, h: panel.h }, targets.current, snapTh);
          x += snap.dx;
          y += snap.dy;
        }
        movePanel(panel.id, x - panel.x, y - panel.y);
      }}
      onTransformEnd={() => {
        const node = ref.current;
        if (!node) return;
        const w = panel.w * node.scaleX();
        const h = panel.h * node.scaleY();
        node.scale({ x: 1, y: 1 });
        resizePanel(panel.id, { x: node.x(), y: node.y(), w, h });
      }}
    >
      <Rect width={panel.w} height={panel.h} fill="#eef0f3" />
      {img &&
        (() => {
          const r = liveImage ?? panel.imageRect;
          // posisi gambar yang diatur guru, atau otomatis memenuhi panel
          return r ? (
            <KImage image={img} x={r.x - panel.x} y={r.y - panel.y} width={r.w} height={r.h} />
          ) : (
            <KImage image={img} width={panel.w} height={panel.h} crop={coverCrop(img, panel.w, panel.h)} />
          );
        })()}
      {(!img || generating) && (
        <>
          {img && <Rect width={panel.w} height={panel.h} fill="#ffffff" opacity={0.7} listening={false} />}
          <Text
            width={panel.w}
            height={panel.h}
            align="center"
            verticalAlign="middle"
            fontSize={24}
            fill={generating ? "#0f766e" : "#9aa0aa"}
            text={generating ? "Membuat gambar..." : `Panel ${index + 1}\nGambar belum dibuat`}
            listening={false}
          />
        </>
      )}
      {lokal ? (
        <Line points={lokal} closed stroke="#111" strokeWidth={6} lineJoin="miter" listening={false} />
      ) : (
        <Rect width={panel.w} height={panel.h} stroke="#111" strokeWidth={6} listening={false} />
      )}
    </Group>
  );
}

/** Elemen "kumpulan benda": ikon vektor sejumlah tepat `jumlah`, disusun per `kolom`. */
function ElementView({
  el,
  selected,
  draggable,
  offset,
  onSelect,
  onDragState,
  trRef,
}: {
  el: MathElement;
  selected: boolean;
  draggable: boolean;
  offset: { dx: number; dy: number };
  onSelect: () => void;
  onDragState: (dragging: boolean) => void;
  trRef: React.RefObject<Konva.Transformer | null>;
}) {
  const update = useEditor((s) => s.updateElement);
  const ref = useRef<Konva.Group>(null);

  useEffect(() => {
    if (selected && ref.current && trRef.current) {
      trRef.current.nodes([ref.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selected, trRef, el.w, el.h, el.x, el.y]);

  if (!el.visible) return null;
  return (
    <Group
      ref={ref}
      x={el.x + offset.dx}
      y={el.y + offset.dy}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={() => {
        onSelect();
        onDragState(true);
      }}
      onDragEnd={(e) => {
        onDragState(false);
        update(el.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) });
      }}
      onTransformEnd={() => {
        const node = ref.current;
        if (!node) return;
        const w = Math.max(40, Math.round(el.w * node.scaleX()));
        const h = Math.max(40, Math.round(el.h * node.scaleY()));
        node.scale({ x: 1, y: 1 });
        update(el.id, { x: Math.round(node.x()), y: Math.round(node.y()), w, h });
      }}
    >
      {/* bidang transparan agar seluruh kotak elemen bisa diklik dan diseret */}
      <Rect width={el.w} height={el.h} fill="#ffffff" opacity={0.01} />
      {layoutKumpulan(el).map((pos, i) => (
        <IkonBendaView key={i} ikon={el.ikon} x={pos.x} y={pos.y} size={pos.size} />
      ))}
    </Group>
  );
}

/**
 * Mode edit gambar: gambar utuh ditampilkan pudar (bagian di luar panel terlihat), bisa diseret dan
 * diubah ukurannya dari sudut dengan rasio tetap. Gambar di dalam panel mengikuti secara langsung.
 */
function ImageEditor({
  panel,
  scale,
  onLive,
}: {
  panel: Panel;
  scale: number;
  onLive: (r: { x: number; y: number; w: number; h: number } | null) => void;
}) {
  const img = useImage(panel.imageUrl);
  const setImageRect = useEditor((s) => s.setImageRect);
  const ref = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (img && ref.current && trRef.current) {
      trRef.current.nodes([ref.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [img, panel.imageRect]);

  if (!img) return null;
  const r = panel.imageRect ?? coverRect(panel, img.width, img.height);
  const baca = () => {
    const n = ref.current!;
    return { x: n.x(), y: n.y(), w: n.width() * n.scaleX(), h: n.height() * n.scaleY() };
  };

  return (
    <>
      <KImage
        ref={ref}
        image={img}
        x={r.x}
        y={r.y}
        width={r.w}
        height={r.h}
        opacity={0.45}
        draggable
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = "move";
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = "";
        }}
        onDragMove={() => onLive(baca())}
        onTransform={() => onLive(baca())}
        onDragEnd={() => {
          setImageRect(panel.id, baca());
          onLive(null);
        }}
        onTransformEnd={() => {
          const hasil = baca();
          ref.current!.scale({ x: 1, y: 1 });
          setImageRect(panel.id, hasil);
          onLive(null);
        }}
      />
      <Transformer
        ref={trRef}
        rotateEnabled={false}
        keepRatio
        enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
        borderStroke="#2563eb"
        anchorStroke="#2563eb"
        anchorSize={10}
        anchorCornerRadius={5}
        boundBoxFunc={(oldBox, newBox) => (newBox.width < 40 * scale || newBox.height < 40 * scale ? oldBox : newBox)}
      />
    </>
  );
}

/** Titik sudut untuk memiringkan panel, dengan tempel ke garis panel lain dan sudut panel itu sendiri. */
function CornerHandles({ panel, scale, snapTh, onGuides }: { panel: Panel; scale: number; snapTh: number; onGuides: (g: Guides | null) => void }) {
  const setCorner = useEditor((s) => s.setCorner);
  const [live, setLive] = useState<Point[] | null>(null);
  const [versi, setVersi] = useState(0);
  const targets = useRef<SnapTargets | null>(null);
  const corners = live ?? panelCorners(panel);

  return (
    <>
      <Line points={corners.flatMap((c) => [c.x, c.y])} closed stroke="#2563eb" strokeWidth={2 / scale} dash={[8 / scale, 5 / scale]} listening={false} />
      {panelCorners(panel).map((c, i) => (
        <Circle
          key={`${i}-${versi}`}
          x={c.x}
          y={c.y}
          radius={9 / scale}
          fill="#fff"
          stroke="#2563eb"
          strokeWidth={2.5 / scale}
          draggable
          onMouseEnter={(e) => {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = "move";
          }}
          onMouseLeave={(e) => {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = "";
          }}
          onDragStart={() => {
            const st = useEditor.getState();
            const page = st.pages.find((p) => p.id === st.activePageId);
            if (!page) return;
            const t = snapTargets(page, panel.id);
            // sudut lain di panel yang sama juga jadi acuan, agar sisi bisa dibuat tegak/datar lagi
            panelCorners(panel).forEach((o, j) => {
              if (j !== i) {
                t.xs.push(o.x);
                t.ys.push(o.y);
              }
            });
            targets.current = t;
          }}
          onDragMove={(e) => {
            const snap = targets.current ? snapPoint({ x: e.target.x(), y: e.target.y() }, targets.current, snapTh) : null;
            const pt = snap?.pt ?? { x: e.target.x(), y: e.target.y() };
            e.target.position(pt);
            onGuides(snap?.guides ?? null);
            setLive(panelCorners(panel).map((o, j) => (j === i ? pt : o)));
          }}
          onDragEnd={(e) => {
            const akhir = { x: e.target.x(), y: e.target.y() };
            setCorner(panel.id, i, targets.current ? snapPoint(akhir, targets.current, snapTh).pt : akhir);
            setLive(null);
            onGuides(null);
            setVersi((v) => v + 1); // pasang ulang titik dari data (bentuk tidak valid ditolak dan kembali)
          }}
        />
      ))}
    </>
  );
}

function BubbleShape({ b }: { b: Bubble }) {
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

function BubbleView({
  b,
  fontFamily,
  selected,
  draggable,
  offset,
  onSelect,
  onDragState,
  trRef,
}: {
  b: Bubble;
  fontFamily: string;
  selected: boolean;
  draggable: boolean;
  /** pergeseran sementara saat panel induknya diseret */
  offset: { dx: number; dy: number };
  onSelect: () => void;
  onDragState: (dragging: boolean) => void;
  trRef: React.RefObject<Konva.Transformer | null>;
}) {
  const update = useEditor((s) => s.updateBubble);
  const ref = useRef<Konva.Group>(null);

  useEffect(() => {
    if (selected && ref.current && trRef.current) {
      trRef.current.nodes([ref.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selected, trRef, b.w, b.h, b.x, b.y]);

  if (!b.visible) return null;
  const pad = 14;
  return (
    <Group
      ref={ref}
      x={b.x + offset.dx}
      y={b.y + offset.dy}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={() => {
        onSelect();
        onDragState(true);
      }}
      onDragEnd={(e) => {
        onDragState(false);
        update(b.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) });
      }}
      onTransformEnd={() => {
        const node = ref.current;
        if (!node) return;
        const w = Math.max(80, Math.round(b.w * node.scaleX()));
        const h = Math.max(50, Math.round(b.h * node.scaleY()));
        node.scale({ x: 1, y: 1 });
        update(b.id, { x: Math.round(node.x()), y: Math.round(node.y()), w, h });
      }}
    >
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
      {selected && b.tail && (
        <Circle
          x={b.w / 2 + b.tail.dx}
          y={b.h / 2 + b.tail.dy}
          radius={9}
          fill="#0f766e"
          stroke="#fff"
          strokeWidth={2}
          draggable
          onDragMove={(e) => {
            e.cancelBubble = true;
          }}
          onDragEnd={(e) => {
            e.cancelBubble = true;
            update(b.id, { tail: { dx: Math.round(e.target.x() - b.w / 2), dy: Math.round(e.target.y() - b.h / 2) } });
          }}
        />
      )}
    </Group>
  );
}

export default function EditorCanvas({ fontFamily, generating = false }: { fontFamily: string; generating?: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const panelTrRef = useRef<Konva.Transformer>(null);
  const elTrRef = useRef<Konva.Transformer>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [, setFontTick] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [guides, setGuides] = useState<Guides | null>(null);
  const [liveImage, setLiveImage] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const page = useEditor((s) => s.pages.find((p) => p.id === s.activePageId));
  const selectedId = useEditor((s) => s.selectedId);
  const tool = useEditor((s) => s.tool);
  const zoom = useEditor((s) => s.zoom);
  const select = useEditor((s) => s.select);
  const addBubble = useEditor((s) => s.addBubble);
  const drag = useEditor((s) => s.drag);
  const splitPanel = useEditor((s) => s.splitPanel);
  const duplicatePanel = useEditor((s) => s.duplicatePanel);
  const deletePanel = useEditor((s) => s.deletePanel);
  const duplicateBubble = useEditor((s) => s.duplicateBubble);
  const deleteBubble = useEditor((s) => s.deleteBubble);
  const cornerEdit = useEditor((s) => s.cornerEdit);
  const setCornerEdit = useEditor((s) => s.setCornerEdit);
  const resetCorners = useEditor((s) => s.resetCorners);
  const selectedLayer = useEditor((s) => s.selectedLayer);
  const addKumpulan = useEditor((s) => s.addKumpulan);
  const duplicateElement = useEditor((s) => s.duplicateElement);
  const deleteElement = useEditor((s) => s.deleteElement);
  const setImageRect = useEditor((s) => s.setImageRect);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // gambar ulang setelah font siap agar ukuran teks balon akurat
  useEffect(() => {
    document.fonts?.ready.then(() => setFontTick((t) => t + 1));
  }, []);

  const selPanel = page?.panels.find((p) => p.id === selectedId) ?? null;
  const selBubble = page?.bubbles.find((b) => b.id === selectedId) ?? null;
  const selElement = page?.elements.find((e) => e.id === selectedId) ?? null;

  // lepas Transformer milik jenis yang tidak sedang dipilih
  useEffect(() => {
    if (!selBubble) trRef.current?.nodes([]);
    if (!selElement) elTrRef.current?.nodes([]);
    if (!selPanel || cornerEdit || selectedLayer === "gambar") panelTrRef.current?.nodes([]);
  }, [selBubble, selElement, selPanel, cornerEdit, selectedLayer]);

  const editGambar = selPanel && selectedLayer === "gambar" && selPanel.imageUrl ? selPanel : null;

  if (!page) return null;

  const fit = Math.min((size.w - FIT_PADDING) / PAGE_W, (size.h - FIT_PADDING) / PAGE_H);
  const scale = Math.max(0.05, fit) * zoom;
  const offsetX = Math.max(0, (size.w - PAGE_W * scale) / 2);
  const offsetY = Math.max(FIT_PADDING / 2, (size.h - PAGE_H * scale) / 2);

  const placeBubble = (panelId: string) => (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (tool === "move") return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    const cx = (pos.x - offsetX) / scale;
    const cy = (pos.y - offsetY) / scale;
    if (tool === "mat") addKumpulan(panelId, cx, cy);
    else addBubble(panelId, "bicara", cx, cy);
  };

  // toolbar mengambang di atas elemen terpilih (di bawahnya bila tidak ada ruang di atas)
  const sel = selPanel ?? selBubble ?? selElement;
  const toolbar =
    sel && tool === "move" && !dragging
      ? (() => {
          const top = offsetY + sel.y * scale - 52;
          return {
            left: offsetX + (sel.x + sel.w / 2) * scale,
            top: top < 4 ? offsetY + (sel.y + sel.h) * scale + 10 : top,
          };
        })()
      : null;
  const tbBtn = "grid h-8 w-8 place-items-center rounded-lg hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-auto" style={{ cursor: tool === "move" ? "default" : "crosshair" }}>
      <Stage
        width={Math.max(size.w, PAGE_W * scale + offsetX * 2)}
        height={Math.max(size.h, PAGE_H * scale + offsetY * 2)}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage() || e.target.name() === "page-bg") select(null);
        }}
      >
        <Layer x={offsetX} y={offsetY} scaleX={scale} scaleY={scale}>
          <Rect name="page-bg" width={PAGE_W} height={PAGE_H} fill="#fff" shadowColor="#000" shadowOpacity={0.18} shadowBlur={24} />
          {page.panels.map((p, i) => (
            <PanelView
              key={p.id}
              panel={p}
              index={i}
              generating={generating}
              cornerMode={cornerEdit === p.id}
              imageMode={editGambar?.id === p.id}
              liveImage={editGambar?.id === p.id ? liveImage : null}
              snapTh={8 / scale}
              onGuides={setGuides}
              selected={p.id === selectedId}
              tool={tool}
              onSelect={() => select(p.id)}
              onTextTool={placeBubble(p.id)}
              onDragState={setDragging}
              trRef={panelTrRef}
            />
          ))}
          {page.elements.map((el) => (
            <ElementView
              key={el.id}
              el={el}
              selected={el.id === selectedId}
              draggable={tool === "move"}
              offset={drag && drag.panelId === el.panelId ? drag : { dx: 0, dy: 0 }}
              onSelect={() => tool === "move" && select(el.id)}
              onDragState={setDragging}
              trRef={elTrRef}
            />
          ))}
          <Transformer
            ref={elTrRef}
            rotateEnabled={false}
            keepRatio={false}
            borderStroke="#7c3aed"
            anchorStroke="#7c3aed"
            anchorSize={10}
            enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "top-center", "bottom-center"]}
          />
          {/* gambar yang sedang diatur berada di bawah balon agar teks tetap terbaca */}
          {editGambar && <ImageEditor key={`${editGambar.id}-${editGambar.imageUrl}`} panel={editGambar} scale={scale} onLive={setLiveImage} />}
          {page.bubbles.map((b) => (
            <BubbleView
              key={b.id}
              b={b}
              fontFamily={fontFamily}
              selected={b.id === selectedId}
              draggable={tool === "move"}
              offset={drag && drag.panelId === b.panelId ? drag : { dx: 0, dy: 0 }}
              onSelect={() => tool === "move" && select(b.id)}
              onDragState={setDragging}
              trRef={trRef}
            />
          ))}
          {selPanel && cornerEdit === selPanel.id && <CornerHandles panel={selPanel} scale={scale} snapTh={8 / scale} onGuides={setGuides} />}
          {guides?.x.map((x) => (
            <Line key={`gx-${x}`} points={[x, 0, x, PAGE_H]} stroke="#db2777" strokeWidth={1.5 / scale} dash={[6 / scale, 4 / scale]} listening={false} />
          ))}
          {guides?.y.map((y) => (
            <Line key={`gy-${y}`} points={[0, y, PAGE_W, y]} stroke="#db2777" strokeWidth={1.5 / scale} dash={[6 / scale, 4 / scale]} listening={false} />
          ))}
          <Transformer
            ref={panelTrRef}
            rotateEnabled={false}
            keepRatio={false}
            borderStroke="#2563eb"
            anchorStroke="#2563eb"
            anchorSize={10}
            anchorCornerRadius={5}
          />
          <Transformer
            ref={trRef}
            rotateEnabled={false}
            keepRatio={false}
            borderStroke="#0f766e"
            anchorStroke="#0f766e"
            anchorSize={10}
            enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right"]}
          />
        </Layer>
      </Stage>
      {toolbar && sel && (
        <div
          role="toolbar"
          aria-label={editGambar ? "Aksi gambar" : selPanel ? "Aksi panel" : selElement ? "Aksi elemen" : "Aksi balon"}
          className="absolute z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-line bg-surface p-1 shadow-lg"
          style={{ left: toolbar.left, top: toolbar.top }}
        >
          {editGambar ? (
            <>
              <span className="px-2 text-xs font-medium text-gray-600">Gambar</span>
              <button
                type="button"
                title="Sesuaikan gambar ke panel"
                aria-label="Sesuaikan gambar ke panel"
                onClick={() => setImageRect(editGambar.id, null)}
                className={tbBtn}
              >
                <Maximize size={17} />
              </button>
              <button type="button" title="Selesai mengatur gambar" aria-label="Selesai mengatur gambar" onClick={() => select(editGambar.id)} className={tbBtn}>
                <Check size={17} />
              </button>
            </>
          ) : selPanel ? (
            <>
              <button
                type="button"
                title="Bagi kiri-kanan"
                aria-label="Bagi panel kiri-kanan"
                disabled={page.panels.length >= MAX_PANELS_PER_PAGE}
                onClick={() => splitPanel(selPanel.id, "horizontal")}
                className={tbBtn}
              >
                <Columns2 size={17} />
              </button>
              <button
                type="button"
                title="Bagi atas-bawah"
                aria-label="Bagi panel atas-bawah"
                disabled={page.panels.length >= MAX_PANELS_PER_PAGE}
                onClick={() => splitPanel(selPanel.id, "vertikal")}
                className={tbBtn}
              >
                <Rows2 size={17} />
              </button>
              <button
                type="button"
                title={cornerEdit === selPanel.id ? "Selesai memiringkan" : "Miringkan sudut panel"}
                aria-label="Miringkan sudut panel"
                aria-pressed={cornerEdit === selPanel.id}
                onClick={() => setCornerEdit(cornerEdit === selPanel.id ? null : selPanel.id)}
                className={`${tbBtn} ${cornerEdit === selPanel.id ? "bg-blue-100 text-blue-700" : ""}`}
              >
                <Shapes size={17} />
              </button>
              {selPanel.corners && (
                <button type="button" title="Kembalikan jadi kotak" aria-label="Kembalikan panel jadi kotak" onClick={() => resetCorners(selPanel.id)} className={tbBtn}>
                  <Square size={17} />
                </button>
              )}
              <button
                type="button"
                title="Duplikat panel"
                aria-label="Duplikat panel"
                disabled={page.panels.length >= MAX_PANELS_PER_PAGE}
                onClick={() => duplicatePanel(selPanel.id)}
                className={tbBtn}
              >
                <Copy size={17} />
              </button>
              <button
                type="button"
                title={page.panels.length <= 1 ? "Halaman harus punya minimal satu panel" : "Hapus panel"}
                aria-label="Hapus panel"
                disabled={page.panels.length <= 1}
                onClick={() => deletePanel(selPanel.id)}
                className={`${tbBtn} text-danger`}
              >
                <Trash2 size={17} />
              </button>
            </>
          ) : selElement ? (
            <>
              <button type="button" title="Duplikat elemen" aria-label="Duplikat elemen" onClick={() => duplicateElement(selElement.id)} className={tbBtn}>
                <Copy size={17} />
              </button>
              <button type="button" title="Hapus elemen" aria-label="Hapus elemen" onClick={() => deleteElement(selElement.id)} className={`${tbBtn} text-danger`}>
                <Trash2 size={17} />
              </button>
            </>
          ) : (
            selBubble && (
              <>
                <button type="button" title="Duplikat balon" aria-label="Duplikat balon" onClick={() => duplicateBubble(selBubble.id)} className={tbBtn}>
                  <Copy size={17} />
                </button>
                <button type="button" title="Hapus balon" aria-label="Hapus balon" onClick={() => deleteBubble(selBubble.id)} className={`${tbBtn} text-danger`}>
                  <Trash2 size={17} />
                </button>
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}
