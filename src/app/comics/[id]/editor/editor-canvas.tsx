"use client";

import { useEffect, useRef, useState } from "react";
import { Circle, Ellipse, Group, Image as KImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import type Konva from "konva";
import { useEditor } from "@/lib/editor/store";
import { PAGE_H, PAGE_W, type Bubble, type Panel } from "@/lib/editor/types";

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

function PanelView({ panel, index, onTextTool }: { panel: Panel; index: number; onTextTool: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void }) {
  const img = useImage(panel.imageUrl);
  if (!panel.visible) return null;
  return (
    <Group
      clipFunc={(ctx) => ctx.rect(panel.x, panel.y, panel.w, panel.h)}
      onClick={onTextTool}
      onTap={onTextTool}
    >
      <Rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} fill="#eef0f3" />
      {img ? (
        <KImage image={img} x={panel.x} y={panel.y} width={panel.w} height={panel.h} />
      ) : (
        <Text
          x={panel.x}
          y={panel.y}
          width={panel.w}
          height={panel.h}
          align="center"
          verticalAlign="middle"
          fontSize={24}
          fill="#9aa0aa"
          text={`Panel ${index + 1}\nGambar belum dibuat`}
          listening={false}
        />
      )}
      <Rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} stroke="#111" strokeWidth={6} listening={false} />
    </Group>
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
  onSelect,
  trRef,
}: {
  b: Bubble;
  fontFamily: string;
  selected: boolean;
  draggable: boolean;
  onSelect: () => void;
  trRef: React.RefObject<Konva.Transformer | null>;
}) {
  const update = useEditor((s) => s.updateBubble);
  const ref = useRef<Konva.Group>(null);

  useEffect(() => {
    if (selected && ref.current && trRef.current) {
      trRef.current.nodes([ref.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selected, trRef, b.w, b.h]);

  if (!b.visible) return null;
  const pad = 14;
  return (
    <Group
      ref={ref}
      x={b.x}
      y={b.y}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={onSelect}
      onDragEnd={(e) => update(b.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) })}
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

export default function EditorCanvas({ fontFamily }: { fontFamily: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [, setFontTick] = useState(0);

  const page = useEditor((s) => s.pages.find((p) => p.id === s.activePageId));
  const selectedId = useEditor((s) => s.selectedId);
  const tool = useEditor((s) => s.tool);
  const zoom = useEditor((s) => s.zoom);
  const select = useEditor((s) => s.select);
  const addBubble = useEditor((s) => s.addBubble);

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

  // lepas Transformer bila seleksi kosong
  useEffect(() => {
    if (!selectedId) trRef.current?.nodes([]);
  }, [selectedId]);

  if (!page) return null;

  const fit = Math.min((size.w - FIT_PADDING) / PAGE_W, (size.h - FIT_PADDING) / PAGE_H);
  const scale = Math.max(0.05, fit) * zoom;
  const offsetX = Math.max(0, (size.w - PAGE_W * scale) / 2);
  const offsetY = Math.max(FIT_PADDING / 2, (size.h - PAGE_H * scale) / 2);

  const placeBubble = (panelId: string) => (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (tool !== "text") return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    addBubble(panelId, "bicara", (pos.x - offsetX) / scale, (pos.y - offsetY) / scale);
  };

  return (
    <div ref={wrapRef} className="h-full w-full overflow-auto" style={{ cursor: tool === "text" ? "crosshair" : "default" }}>
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
            <PanelView key={p.id} panel={p} index={i} onTextTool={placeBubble(p.id)} />
          ))}
          {page.bubbles.map((b) => (
            <BubbleView
              key={b.id}
              b={b}
              fontFamily={fontFamily}
              selected={b.id === selectedId}
              draggable={tool === "move"}
              onSelect={() => tool === "move" && select(b.id)}
              trRef={trRef}
            />
          ))}
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
    </div>
  );
}
