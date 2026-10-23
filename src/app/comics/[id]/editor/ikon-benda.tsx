"use client";

import { Circle, Ellipse, Group, Line, Path, Rect, Star } from "react-konva";
import type { IkonBenda } from "@/lib/editor/types";

const GARIS = "#3b2f2f";

/**
 * Ikon benda vektor dalam kotak 100x100, diskalakan ke `size`. Digambar dengan bentuk Konva (bukan emoji
 * atau gambar AI) agar tampil sama di semua perangkat dan ikut terekspor ke PDF.
 */
export function IkonBendaView({ ikon, x, y, size }: { ikon: IkonBenda; x: number; y: number; size: number }) {
  const s = (size / 100) * 0.86; // sedikit jarak antar ikon
  const o = size * 0.07;
  return (
    <Group x={x + o} y={y + o} scaleX={s} scaleY={s} listening={false}>
      {ikon === "apel" && (
        <>
          <Path data="M50 30 C 32 12, 4 26, 12 62 C 18 88, 38 98, 50 88 C 62 98, 82 88, 88 62 C 96 26, 68 12, 50 30 Z" fill="#e53935" stroke={GARIS} strokeWidth={3} />
          <Line points={[50, 30, 54, 10]} stroke="#6d4c41" strokeWidth={6} lineCap="round" />
          <Path data="M56 20 C 66 6, 82 8, 84 12 C 76 24, 64 26, 56 20 Z" fill="#43a047" stroke={GARIS} strokeWidth={2} />
          <Ellipse x={32} y={46} radiusX={6} radiusY={10} fill="#ffffff" opacity={0.45} />
        </>
      )}
      {ikon === "jeruk" && (
        <>
          <Circle x={50} y={56} radius={38} fill="#fb8c00" stroke={GARIS} strokeWidth={3} />
          <Circle x={50} y={22} radius={4} fill="#6d4c41" />
          <Path data="M52 20 C 62 6, 78 8, 80 12 C 72 22, 60 24, 52 20 Z" fill="#43a047" stroke={GARIS} strokeWidth={2} />
          <Ellipse x={34} y={44} radiusX={6} radiusY={9} fill="#ffffff" opacity={0.4} />
        </>
      )}
      {ikon === "kue" && (
        <>
          <Path data="M24 54 L76 54 L68 94 L32 94 Z" fill="#a1887f" stroke={GARIS} strokeWidth={3} />
          <Line points={[38, 58, 40, 92]} stroke={GARIS} strokeWidth={2} opacity={0.5} />
          <Line points={[50, 58, 50, 92]} stroke={GARIS} strokeWidth={2} opacity={0.5} />
          <Line points={[62, 58, 60, 92]} stroke={GARIS} strokeWidth={2} opacity={0.5} />
          <Ellipse x={50} y={46} radiusX={32} radiusY={18} fill="#f8bbd0" stroke={GARIS} strokeWidth={3} />
          <Circle x={50} y={26} radius={8} fill="#d32f2f" stroke={GARIS} strokeWidth={2} />
        </>
      )}
      {ikon === "bintang" && <Star x={50} y={54} numPoints={5} innerRadius={20} outerRadius={46} fill="#fdd835" stroke={GARIS} strokeWidth={3} lineJoin="round" />}
      {ikon === "kelereng" && (
        <>
          <Circle x={50} y={52} radius={38} fill="#1e88e5" stroke={GARIS} strokeWidth={3} />
          <Path data="M30 60 C 40 40, 60 70, 72 46" stroke="#90caf9" strokeWidth={6} lineCap="round" />
          <Circle x={36} y={38} radius={8} fill="#ffffff" opacity={0.6} />
        </>
      )}
      {ikon === "pensil" && (
        <>
          <Rect x={38} y={14} width={24} height={58} fill="#fdd835" stroke={GARIS} strokeWidth={3} />
          <Rect x={38} y={6} width={24} height={10} fill="#f48fb1" stroke={GARIS} strokeWidth={3} />
          <Path data="M38 72 L62 72 L50 96 Z" fill="#ffe0b2" stroke={GARIS} strokeWidth={3} lineJoin="round" />
          <Path data="M46 88 L54 88 L50 96 Z" fill={GARIS} />
        </>
      )}
    </Group>
  );
}
