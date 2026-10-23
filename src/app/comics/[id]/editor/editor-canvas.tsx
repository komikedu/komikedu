"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Group, Image as KImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import type Konva from "konva";
import { Check, ChevronLeft, ChevronRight, Columns2, Copy, ImagePlus, Loader2, Maximize, Rows2, Shapes, Square, Trash2 } from "lucide-react";
import { MAX_PANELS_PER_PAGE, coverRect, panelCorners } from "@/lib/editor/panel-ops";
import { panelDiTitik, panelTujuan, pilihBerkasGambar, seretanBerkas } from "@/lib/editor/lepas-gambar";
import { snapPoint, snapRectMove, snapTargets, type Guides, type SnapTargets } from "@/lib/editor/snap";
import { IkonBendaView } from "./ikon-benda";
import { useVersiGambar } from "./use-versi-gambar";
import { FONT_MAX, FONT_MIN } from "@/lib/editor/gaya-teks";
import { adaPapanKlip } from "@/lib/editor/papan-klip";
import { useStatusPanel } from "@/lib/editor/status-panel";
import { muatFontGaya } from "./font-gaya";
import { GambarPanel, IsiBalon, IsiElemen, LatarPanel, TepiPanel, klipPanel, titikLokal } from "./bentuk-halaman";
import { seleksiAktif, useEditor } from "@/lib/editor/store";
import { PAGE_H, PAGE_W, type Bubble, type MathElement, type Panel, type Point } from "@/lib/editor/types";

const FIT_PADDING = 48;
/** Kelebihan ukuran konten (px) yang dianggap bisa digulir saat menggeser kanvas; di bawahnya hanya lebar scrollbar. */
const LEBIH_GULIR = 24;
/** Bagian halaman (px) yang harus tetap terlihat saat kanvas digeser bebas. */
const SISA_LAYAR = 80;

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
  tool: "move" | "text" | "mat" | "teksgaya" | "pan";
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

  const bgRef = useRef<Konva.Rect>(null);

  // kotak pilihan (Transformer) mengikuti ukuran panel, bukan gambar yang menjulur keluar panel;
  // Konva tidak memperhitungkan klip saat menghitung kotak sebuah grup
  useEffect(() => {
    const g = ref.current;
    const bg = bgRef.current;
    if (!g || !bg) return;
    const asli = g.getClientRect;
    g.getClientRect = (cfg) => bg.getClientRect(cfg);
    return () => {
      g.getClientRect = asli;
    };
  }, [panel.visible]);

  useEffect(() => {
    if (selected && !cornerMode && !imageMode && ref.current && trRef.current) {
      trRef.current.nodes([ref.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selected, cornerMode, imageMode, trRef, panel.w, panel.h, panel.x, panel.y, panel.imageRect]);

  if (!panel.visible) return null;
  // titik-titik poligon relatif terhadap pojok kotak pembatas (posisi grup)
  const lokal = titikLokal(panel);
  const clip = klipPanel(panel, lokal);
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
      <Rect ref={bgRef} width={panel.w} height={panel.h} fill="#eef0f3" />
      <LatarPanel panel={panel} />
      {img && <GambarPanel panel={panel} img={img} rect={liveImage} />}
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
      <StatusPanelView panel={panel} memuat={!!panel.imageUrl && !img} />
      <TepiPanel panel={panel} lokal={lokal} />
    </Group>
  );
}

/**
 * Keterangan proses di atas panel: tahap unggah gambar dengan bar kemajuan, atau "Memuat gambar..." saat gambar
 * panel sudah ada tetapi masih diunduh. Bar tanpa persen bergerak bolak-balik karena lamanya tidak diketahui.
 */
function StatusPanelView({ panel, memuat }: { panel: Panel; memuat: boolean }) {
  const status = useStatusPanel((s) => s.perPanel[panel.id]);
  // gambar yang tidak kunjung selesai diunduh (mis. alamatnya rusak) tidak boleh menampilkan "Memuat..." selamanya
  const [menyerah, setMenyerah] = useState(false);
  useEffect(() => {
    setMenyerah(false);
    if (!memuat) return;
    const t = setTimeout(() => setMenyerah(true), 30_000);
    return () => clearTimeout(t);
  }, [memuat, panel.imageUrl]);
  const aktif = status ?? (memuat && !menyerah ? { teks: "Memuat gambar...", persen: null } : null);
  const [tik, setTik] = useState(0);
  const bergerak = !!aktif && aktif.persen === null;
  useEffect(() => {
    if (!bergerak) return;
    const t = setInterval(() => setTik((n) => n + 1), 50);
    return () => clearInterval(t);
  }, [bergerak]);
  if (!aktif) return null;

  const lebarBar = Math.min(panel.w * 0.7, 360);
  const x = (panel.w - lebarBar) / 2;
  const y = panel.h / 2 + 22;
  const segmen = lebarBar * 0.35;
  const posisi = ((tik * 4) % (2 * (lebarBar - segmen))) ;
  const geser = posisi <= lebarBar - segmen ? posisi : 2 * (lebarBar - segmen) - posisi;
  return (
    <>
      <Rect width={panel.w} height={panel.h} fill="#ffffff" opacity={0.82} listening={false} />
      <Text x={0} y={panel.h / 2 - 40} width={panel.w} align="center" fontSize={24} fontStyle="bold" fill="#0f766e" text={aktif.persen !== null ? `${aktif.teks} ${aktif.persen}%` : aktif.teks} listening={false} />
      <Rect x={x} y={y} width={lebarBar} height={12} cornerRadius={6} fill="#cfe7e3" listening={false} />
      {aktif.persen !== null ? (
        <Rect x={x} y={y} width={Math.max(12, (lebarBar * aktif.persen) / 100)} height={12} cornerRadius={6} fill="#0f766e" listening={false} />
      ) : (
        <Rect x={x + geser} y={y} width={segmen} height={12} cornerRadius={6} fill="#0f766e" listening={false} />
      )}
    </>
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
  }, [selected, trRef, el.w, el.h, el.x, el.y, el.rotasi]);

  // huruf gaya baru termuat setelah kanvas pertama kali menggambar: gambar ulang supaya tidak tertinggal huruf cadangan
  const stiker = useImage(el.kind === "stiker" ? el.url : null);
  const teks = el.kind === "teks";
  useEffect(() => {
    if (teks) void muatFontGaya().then(() => ref.current?.getLayer()?.batchDraw());
  }, [teks]);

  if (!el.visible) return null;
  return (
    <Group
      ref={ref}
      x={el.x + offset.dx}
      y={el.y + offset.dy}
      rotation={el.rotasi ?? 0}
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
        const sudut = Math.round(((node.rotation() + 540) % 360) - 180);
        const ukuran = el.kind === "teks" ? { fontSize: Math.max(FONT_MIN, Math.min(FONT_MAX, Math.round(el.fontSize * node.scaleY()))) } : {};
        node.scale({ x: 1, y: 1 });
        update(el.id, { x: Math.round(node.x()), y: Math.round(node.y()), w, h, rotasi: sudut, ...ukuran });
      }}
    >
      {/* bidang transparan agar seluruh kotak elemen bisa diklik dan diseret */}
      <Rect width={el.w} height={el.h} fill="#ffffff" opacity={0.01} />
      <IsiElemen e={el} img={stiker} />
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

function BubbleView({
  b,
  fontFamily,
  selected,
  dalamSeleksi,
  bersama,
  draggable,
  offset,
  onSelect,
  onDragState,
  trRef,
}: {
  b: Bubble;
  fontFamily: string;
  selected: boolean;
  /** ikut dipilih bersama balon lain (Shift/Ctrl+klik) */
  dalamSeleksi: boolean;
  /** semua balon yang dipilih bersama (termasuk balon ini); digeser bersama saat salah satunya diseret */
  bersama: string[];
  draggable: boolean;
  /** pergeseran sementara saat panel induknya diseret */
  offset: { dx: number; dy: number };
  /** `tambah` true bila Shift, Ctrl, atau Cmd ditahan: tambah/lepas dari pilihan, bukan ganti pilihan */
  onSelect: (tambah: boolean) => void;
  onDragState: (dragging: boolean) => void;
  trRef: React.RefObject<Konva.Transformer | null>;
}) {
  const update = useEditor((s) => s.updateBubble);
  const geserBanyak = useEditor((s) => s.geserBalonBanyak);
  const ref = useRef<Konva.Group>(null);

  /** Pasang balon lain yang dipilih bersama pada posisinya semula ditambah pergeseran balon yang diseret. */
  const ikutkanKawan = (stage: Konva.Stage | null, dx: number, dy: number) => {
    const st = useEditor.getState();
    const bubbles = st.pages.find((p) => p.id === st.activePageId)?.bubbles ?? [];
    for (const id of bersama) {
      if (id === b.id) continue;
      const lain = bubbles.find((x) => x.id === id);
      stage?.findOne(`#balon-${id}`)?.position({ x: (lain?.x ?? 0) + dx, y: (lain?.y ?? 0) + dy });
    }
  };

  useEffect(() => {
    if (selected && ref.current && trRef.current) {
      trRef.current.nodes([ref.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selected, trRef, b.w, b.h, b.x, b.y]);

  if (!b.visible) return null;
  return (
    <Group
      ref={ref}
      id={`balon-${b.id}`}
      x={b.x + offset.dx}
      y={b.y + offset.dy}
      rotation={b.gaya?.rotasi ?? 0}
      draggable={draggable}
      onClick={(e) => onSelect(e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey)}
      onTap={() => onSelect(false)}
      onDragStart={() => {
        if (!dalamSeleksi) onSelect(false);
        onDragState(true);
      }}
      onDragMove={(e) => {
        if (dalamSeleksi) ikutkanKawan(e.target.getStage(), e.target.x() - (b.x + offset.dx), e.target.y() - (b.y + offset.dy));
      }}
      onDragEnd={(e) => {
        onDragState(false);
        const x = Math.round(e.target.x());
        const y = Math.round(e.target.y());
        if (dalamSeleksi && bersama.length > 1) {
          // semua balon terpilih bergeser sama jauh, satu langkah riwayat
          ikutkanKawan(e.target.getStage(), x - b.x, y - b.y);
          geserBanyak(bersama, x - b.x, y - b.y);
        } else {
          update(b.id, { x, y });
        }
      }}
      onTransformEnd={() => {
        const node = ref.current;
        if (!node) return;
        const w = Math.max(80, Math.round(b.w * node.scaleX()));
        const h = Math.max(50, Math.round(b.h * node.scaleY()));
        node.scale({ x: 1, y: 1 });
        const sudut = Math.round(((node.rotation() + 540) % 360) - 180);
        update(b.id, { x: Math.round(node.x()), y: Math.round(node.y()), w, h, ...(sudut !== (b.gaya?.rotasi ?? 0) ? { gaya: { ...b.gaya, rotasi: sudut } } : {}) });
      }}
    >
      {/* bidang transparan agar seluruh kotak balon bisa diklik dan diseret, termasuk mode Teks yang tidak punya bentuk */}
      <Rect width={b.w} height={b.h} fill="#ffffff" opacity={0.01} />
      <IsiBalon b={b} fontFamily={fontFamily} />
      {dalamSeleksi && <Rect x={-8} y={-8} width={b.w + 16} height={b.h + 16} stroke="#0f766e" strokeWidth={3} dash={[10, 6]} cornerRadius={8} listening={false} />}
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
            update(b.id, { tail: { ...b.tail, dx: Math.round(e.target.x() - b.w / 2), dy: Math.round(e.target.y() - b.h / 2) } });
          }}
        />
      )}
    </Group>
  );
}

/** Tombol panah "‹ 2/3 ›" untuk berpindah antar versi gambar panel; tidak tampil bila hanya ada satu versi. */
function PenukarVersi({ versi, className }: { versi: ReturnType<typeof useVersiGambar>; className: string }) {
  if (versi.versi.length < 2) return null;
  const { index, pindah, sibuk } = versi;
  return (
    <>
      <span className="mx-0.5 h-5 w-px bg-line" aria-hidden />
      <button type="button" title="Versi gambar sebelumnya" aria-label="Versi gambar sebelumnya" disabled={sibuk || index < 1} onClick={() => void pindah(-1)} className={className}>
        <ChevronLeft size={17} />
      </button>
      <span role="status" aria-label="Versi gambar" className="min-w-9 text-center text-xs tabular-nums text-gray-600">
        {index < 0 ? "–" : index + 1}/{versi.versi.length}
      </span>
      <button type="button" title="Versi gambar berikutnya" aria-label="Versi gambar berikutnya" disabled={sibuk || index < 0 || index >= versi.versi.length - 1} onClick={() => void pindah(1)} className={className}>
        <ChevronRight size={17} />
      </button>
    </>
  );
}

export default function EditorCanvas({
  fontFamily,
  generating = false,
  comicId,
  onLepasGambar,
}: {
  fontFamily: string;
  generating?: boolean;
  comicId?: string;
  /** pasang gambar ke panel (seret-lepas atau tempel); kembalikan pesan galat, atau null bila berhasil. Kosong bila komik belum tersimpan. */
  onLepasGambar?: (panelId: string, file: File) => Promise<string | null>;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const panelTrRef = useRef<Konva.Transformer>(null);
  const elTrRef = useRef<Konva.Transformer>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [, setFontTick] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [scroll, setScroll] = useState({ x: 0, y: 0 });
  /** pergeseran kanvas oleh guru (alat Geser atau tombol tengah mouse) di luar gulir bawaan */
  const [geseran, setGeseran] = useState({ x: 0, y: 0 });
  const [guides, setGuides] = useState<Guides | null>(null);
  const [liveImage, setLiveImage] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  /** panel yang sedang disorot saat berkas diseret di atas kanvas, dan pesan hasil pemasangan gambar */
  const [sasaranLepas, setSasaranLepas] = useState<string | null>(null);
  const [infoLepas, setInfoLepas] = useState<{ ok: boolean; teks: string; sibuk?: boolean } | null>(null);

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
  const addTeksGaya = useEditor((s) => s.addTeksGaya);
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

  /** Pasang beberapa berkas gambar mulai dari panel `panelId` (satu berkas per panel, urut baca). Dipakai seret-lepas dan tempel. */
  const pasangBerkas = useCallback(
    async (berkasMentah: File[], panelId: string) => {
      if (!onLepasGambar) return setInfoLepas({ ok: false, teks: "Hanya tersedia di komik yang tersimpan." });
      const st = useEditor.getState();
      const pg = st.pages.find((p) => p.id === st.activePageId);
      if (!pg) return;
      const tujuan = panelTujuan(pg.panels, panelId, berkasMentah.length);
      const pilihan = pilihBerkasGambar(berkasMentah, tujuan.length);
      if (!pilihan.berkas.length) return setInfoLepas({ ok: false, teks: pilihan.pesan ?? "Tidak ada gambar yang bisa dipasang." });
      for (let i = 0; i < pilihan.berkas.length; i++) {
        const nomor = pg.panels.findIndex((p) => p.id === tujuan[i].id) + 1;
        setInfoLepas({ ok: true, sibuk: true, teks: `Mengunggah gambar ${i + 1}/${pilihan.berkas.length} ke panel ${nomor}...` });
        const galat = await onLepasGambar(tujuan[i].id, pilihan.berkas[i]);
        if (galat) return setInfoLepas({ ok: false, teks: galat });
      }
      setInfoLepas({ ok: true, teks: `Gambar dipasang ke ${pilihan.berkas.length} panel.${pilihan.pesan ? ` ${pilihan.pesan}` : ""} Gambar lama ada di Riwayat gambar.` });
    },
    [onLepasGambar],
  );

  // pesan hasil pemasangan hilang sendiri (yang sedang berjalan tetap tampil)
  useEffect(() => {
    if (!infoLepas || infoLepas.sibuk) return;
    const t = setTimeout(() => setInfoLepas(null), 6000);
    return () => clearTimeout(t);
  }, [infoLepas]);

  // tempel gambar (Ctrl+V) ke panel yang sedang dipilih; tidak aktif saat mengetik di kolom isian
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable]")) return;
      const berkas = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (!berkas.length) return;
      const st = useEditor.getState();
      const panel = st.pages.find((p) => p.id === st.activePageId)?.panels.find((p) => p.id === st.selectedId);
      // tanpa panel terpilih, Ctrl+V menempel objek yang disalin di editor (bila ada), bukan gambar
      if (!panel && adaPapanKlip()) return;
      e.preventDefault();
      if (!panel) return setInfoLepas({ ok: false, teks: "Pilih panel dulu, lalu tempel gambarnya." });
      void pasangBerkas(berkas, panel.id);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [pasangBerkas]);

  // seretan yang terputus (mis. mode gambar dibuka di tengah seretan) tidak boleh menyembunyikan toolbar selamanya
  useEffect(() => {
    setDragging(false);
  }, [selectedId, selectedLayer]);

  const selPanel = page?.panels.find((p) => p.id === selectedId) ?? null;
  const seleksi = useEditor((s) => s.seleksi);
  const toggleSeleksiBalon = useEditor((s) => s.toggleSeleksiBalon);
  const seleksiBalon = seleksiAktif(seleksi, selectedId);
  // saat beberapa balon dipilih bersama tidak ada balon "utama" (tanpa pegangan ubah ukuran dan toolbar mengambang)
  const selBubble = seleksiBalon.length ? null : (page?.bubbles.find((b) => b.id === selectedId) ?? null);
  const selElement = page?.elements.find((e) => e.id === selectedId) ?? null;

  // lepas Transformer milik jenis yang tidak sedang dipilih
  useEffect(() => {
    if (!selBubble) trRef.current?.nodes([]);
    if (!selElement) elTrRef.current?.nodes([]);
    if (!selPanel || cornerEdit || selectedLayer === "gambar") panelTrRef.current?.nodes([]);
  }, [selBubble, selElement, selPanel, cornerEdit, selectedLayer]);

  const editGambar = selPanel && selectedLayer === "gambar" && selPanel.imageUrl ? selPanel : null;
  // riwayat versi gambar panel yang sedang dipilih (hasil buat ulang dan edit AI), untuk tombol panah di toolbar
  const versi = useVersiGambar(comicId, selPanel?.id ?? null, selPanel?.imageUrl ?? null);

  if (!page) return null;

  const fit = Math.min((size.w - FIT_PADDING) / PAGE_W, (size.h - FIT_PADDING) / PAGE_H);
  const scale = Math.max(0.05, fit) * zoom;
  const dasarX = Math.max(0, (size.w - PAGE_W * scale) / 2);
  const dasarY = Math.max(FIT_PADDING / 2, (size.h - PAGE_H * scale) / 2);
  const offsetX = dasarX + geseran.x;
  const offsetY = dasarY + geseran.y;

  /** Panel di bawah kursor saat berkas diseret: posisi layar diubah ke koordinat halaman (memperhitungkan gulir, zoom, dan tepi). */
  const panelDariSeretan = (e: React.DragEvent) => {
    const el = wrapRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left + el.scrollLeft;
    const y = e.clientY - r.top + el.scrollTop;
    return panelDiTitik(page.panels, { x: (x - offsetX) / scale, y: (y - offsetY) / scale });
  };

  const placeBubble = (panelId: string) => (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (tool === "move") return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    const cx = (pos.x - offsetX) / scale;
    const cy = (pos.y - offsetY) / scale;
    if (tool === "mat") addKumpulan(panelId, cx, cy);
    else if (tool === "teksgaya") addTeksGaya(panelId, cx, cy);
    else addBubble(panelId, "bicara", cx, cy);
  };

  /** Alat Elemen Mat atau Teks gaya diklik di luar panel: elemen bebas di halaman. */
  const placeBebas = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (tool !== "mat" && tool !== "teksgaya") return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    const cx = (pos.x - offsetX) / scale;
    const cy = (pos.y - offsetY) / scale;
    if (tool === "mat") addKumpulan(null, cx, cy);
    else addTeksGaya(null, cx, cy);
  };

  // toolbar mengambang di atas elemen terpilih (di bawahnya bila tidak ada ruang di atas), dan selalu
  // ditahan di area yang terlihat supaya tidak ikut tergulung keluar layar (mis. panel yang tinggi)
  const sel = selPanel ?? selBubble ?? selElement;
  const tahan = (n: number, min: number, max: number) => Math.max(min, Math.min(n, Math.max(min, max)));
  const toolbar =
    sel && tool === "move" && !dragging
      ? (() => {
          const top = offsetY + sel.y * scale - 52;
          const ideal = top < 4 ? offsetY + (sel.y + sel.h) * scale + 10 : top;
          return {
            left: tahan(offsetX + (sel.x + sel.w / 2) * scale, scroll.x + 110, scroll.x + size.w - 110),
            top: tahan(ideal, scroll.y + 4, scroll.y + size.h - 48),
          };
        })()
      : null;
  const tbBtn = "grid h-8 w-8 place-items-center rounded-lg hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div
      ref={wrapRef}
      onScroll={(e) => setScroll({ x: e.currentTarget.scrollLeft, y: e.currentTarget.scrollTop })}
      // geser kanvas: tahan tombol tengah mouse (roda) lalu seret, atau seret biasa saat alat Geser aktif. Fase capture agar Konva
      // tidak ikut menanganinya. Sumbu yang masih bisa digulir digulir; sumbu yang muat di layar digeser bebas. Klik dua kali tombol tengah mengembalikan posisi.
      onMouseDownCapture={(e) => {
        const area = wrapRef.current;
        if (!area || !(e.button === 1 || (e.button === 0 && tool === "pan"))) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.button === 1 && e.detail === 2) return setGeseran({ x: 0, y: 0 });
        const mulai = { x: e.clientX, y: e.clientY, kiri: area.scrollLeft, atas: area.scrollTop, g: geseran };
        // selisih sekecil lebar scrollbar (mis. halaman pas selebar layar, lalu scrollbar vertikal memakan ~15px) bukan konten yang
        // bisa digulir; sumbu itu diperlakukan muat di layar supaya seretan tetap menggeser halaman
        const bisaX = area.scrollWidth > area.clientWidth + LEBIH_GULIR;
        const bisaY = area.scrollHeight > area.clientHeight + LEBIH_GULIR;
        area.style.cursor = "grabbing";
        // halaman tidak boleh digeser sampai hilang dari layar: sisakan SISA_LAYAR px tetap terlihat
        const tahanGeser = (g: number, dasar: number, ukuranHalaman: number, ukuranLayar: number) =>
          Math.min(ukuranLayar - SISA_LAYAR - dasar, Math.max(SISA_LAYAR - ukuranHalaman - dasar, g));
        const geser = (ev: MouseEvent) => {
          const dx = ev.clientX - mulai.x;
          const dy = ev.clientY - mulai.y;
          if (bisaX) area.scrollLeft = mulai.kiri - dx;
          if (bisaY) area.scrollTop = mulai.atas - dy;
          setGeseran({
            x: bisaX ? mulai.g.x : tahanGeser(mulai.g.x + dx, dasarX, PAGE_W * scale, size.w),
            y: bisaY ? mulai.g.y : tahanGeser(mulai.g.y + dy, dasarY, PAGE_H * scale, size.h),
          });
        };
        const selesai = () => {
          area.style.cursor = "";
          window.removeEventListener("mousemove", geser);
          window.removeEventListener("mouseup", selesai);
        };
        window.addEventListener("mousemove", geser);
        window.addEventListener("mouseup", selesai);
      }}
      onAuxClick={(e) => e.button === 1 && e.preventDefault()}
      onDragOver={(e) => {
        if (!seretanBerkas(e.dataTransfer.types)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setSasaranLepas(panelDariSeretan(e)?.id ?? null);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSasaranLepas(null);
      }}
      onDrop={(e) => {
        if (!seretanBerkas(e.dataTransfer.types)) return;
        e.preventDefault();
        setSasaranLepas(null);
        const panel = panelDariSeretan(e);
        if (!panel) return setInfoLepas({ ok: false, teks: "Lepaskan gambar di dalam sebuah panel." });
        void pasangBerkas(Array.from(e.dataTransfer.files), panel.id);
      }}
      className="relative h-full w-full overflow-auto"
      style={{ cursor: tool === "move" ? "default" : tool === "pan" ? "grab" : "crosshair" }}
    >
      <Stage
        width={Math.max(size.w, PAGE_W * scale + dasarX * 2)}
        height={Math.max(size.h, PAGE_H * scale + dasarY * 2)}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage() || e.target.name() === "page-bg") select(null);
        }}
      >
        <Layer x={offsetX} y={offsetY} scaleX={scale} scaleY={scale}>
          <Rect name="page-bg" width={PAGE_W} height={PAGE_H} fill="#fff" shadowColor="#000" shadowOpacity={0.18} shadowBlur={24} onClick={placeBebas} onTap={placeBebas} />
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
              offset={drag && el.panelId && drag.panelId === el.panelId ? drag : { dx: 0, dy: 0 }}
              onSelect={() => tool === "move" && select(el.id)}
              onDragState={setDragging}
              trRef={elTrRef}
            />
          ))}
          <Transformer
            ref={elTrRef}
            rotateEnabled
            rotationSnaps={[0, 45, 90, 135, 180, -135, -90, -45]}
            rotationSnapTolerance={6}
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
              selected={b.id === selectedId && !seleksiBalon.length}
              dalamSeleksi={seleksiBalon.includes(b.id)}
              bersama={seleksiBalon}
              draggable={tool === "move"}
              offset={drag && drag.panelId === b.panelId ? drag : { dx: 0, dy: 0 }}
              onSelect={(tambah) => tool === "move" && (tambah ? toggleSeleksiBalon(b.id) : select(b.id))}
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
            rotateEnabled
            rotationSnaps={[0, 45, 90, 135, 180, -135, -90, -45]}
            rotationSnapTolerance={6}
            keepRatio={false}
            borderStroke="#0f766e"
            anchorStroke="#0f766e"
            anchorSize={10}
            enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right"]}
          />
        </Layer>
      </Stage>
      {sasaranLepas &&
        (() => {
          const p = page.panels.find((x) => x.id === sasaranLepas);
          if (!p) return null;
          // sorotan mengikuti bentuk panel: poligon bila miring, kotak bila biasa
          const poligon = p.corners ? `polygon(${p.corners.map((c) => `${((c.x - p.x) / p.w) * 100}% ${((c.y - p.y) / p.h) * 100}%`).join(", ")})` : undefined;
          return (
            <div
              aria-hidden
              className={`pointer-events-none absolute z-10 grid place-items-center bg-brand/20 ${p.corners ? "" : "border-4 border-dashed border-brand"}`}
              style={{ left: offsetX + p.x * scale, top: offsetY + p.y * scale, width: p.w * scale, height: p.h * scale, clipPath: poligon }}
            >
              <span className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground shadow">
                <ImagePlus size={14} /> Lepas untuk memasang gambar
              </span>
            </div>
          );
        })()}
      {infoLepas && (
        <p
          role={infoLepas.ok ? "status" : "alert"}
          className={`absolute z-30 flex max-w-[min(28rem,90%)] -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-xs shadow-lg ${infoLepas.ok ? "bg-gray-900 text-white" : "bg-red-600 text-white"}`}
          style={{ left: scroll.x + size.w / 2, top: scroll.y + size.h - 70 }}
        >
          {infoLepas.sibuk && <Loader2 size={13} className="shrink-0 animate-spin" />}
          <span>{infoLepas.teks}</span>
        </p>
      )}
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
              <PenukarVersi versi={versi} className={tbBtn} />
              <button type="button" title="Selesai mengatur gambar" aria-label="Selesai mengatur gambar" onClick={() => select(editGambar.id)} className={tbBtn}>
                <Check size={17} />
              </button>
            </>
          ) : selPanel ? (
            <>
              <PenukarVersi versi={versi} className={tbBtn} />
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
