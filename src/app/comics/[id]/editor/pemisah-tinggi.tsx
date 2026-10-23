"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

const KUNCI = "komikedu:tinggi-panel-halaman";
const MIN = 96;
const SISA_MIN = 140; // ruang minimal untuk panel di bawahnya

function baca(): number | null {
  try {
    const n = Number(window.localStorage.getItem(KUNCI));
    return Number.isFinite(n) && n >= MIN ? n : null;
  } catch {
    return null;
  }
}

/**
 * Tinggi panel di atas pemisah yang bisa diatur dengan menyeret (atau tombol panah atas/bawah saat pemisah difokus).
 * `null` = otomatis mengikuti isi (dibatasi setengah tinggi kolom). Ukuran diingat di peramban; klik dua kali mengembalikan otomatis.
 */
export function useTinggiPanel(panel: RefObject<HTMLElement | null>) {
  const [tinggi, setTinggi] = useState<number | null>(null);

  useEffect(() => setTinggi(baca()), []);

  const simpan = useCallback((n: number | null) => {
    setTinggi(n);
    try {
      if (n === null) window.localStorage.removeItem(KUNCI);
      else window.localStorage.setItem(KUNCI, String(Math.round(n)));
    } catch {
      // penyimpanan peramban diblokir: ukuran hanya berlaku selama editor terbuka
    }
  }, []);

  /** Batas atas: sisakan ruang untuk panel di bawahnya. */
  const maks = useCallback(() => {
    const el = panel.current;
    const induk = el?.parentElement;
    return el && induk ? Math.max(MIN, induk.clientHeight - el.offsetTop - SISA_MIN) : 600;
  }, [panel]);

  return { tinggi, simpan, maks };
}

export function PemisahTinggi({ panel, tinggi, simpan, maks }: { panel: RefObject<HTMLElement | null>; tinggi: number | null; simpan: (n: number | null) => void; maks: () => number }) {
  const awal = useRef<{ y: number; h: number } | null>(null);
  const batas = (n: number) => Math.min(maks(), Math.max(MIN, n));

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Ubah tinggi panel Halaman"
      aria-valuemin={MIN}
      aria-valuenow={Math.round(tinggi ?? panel.current?.offsetHeight ?? 0)}
      tabIndex={0}
      title="Seret untuk mengubah tinggi. Klik dua kali untuk mengembalikan otomatis."
      onPointerDown={(e) => {
        const el = panel.current;
        if (!el) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        awal.current = { y: e.clientY, h: el.offsetHeight };
      }}
      onPointerMove={(e) => {
        if (awal.current) simpan(batas(awal.current.h + e.clientY - awal.current.y));
      }}
      onPointerUp={() => (awal.current = null)}
      onPointerCancel={() => (awal.current = null)}
      onDoubleClick={() => simpan(null)}
      onKeyDown={(e) => {
        const sekarang = tinggi ?? panel.current?.offsetHeight ?? MIN;
        if (e.key === "ArrowUp") {
          e.preventDefault();
          simpan(batas(sekarang - 24));
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          simpan(batas(sekarang + 24));
        } else if (e.key === "Home" || e.key === "Escape") {
          simpan(null);
        }
      }}
      className="group relative z-10 -my-1 h-2 shrink-0 cursor-row-resize touch-none outline-none"
    >
      <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-transparent transition-colors group-hover:bg-brand group-focus-visible:bg-brand group-active:bg-brand" />
      <span className="absolute left-1/2 top-1/2 h-1 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-line opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
    </div>
  );
}
