"use client";

import { useEffect, useRef, useState } from "react";
import { FlipHorizontal2 } from "lucide-react";
import { BENTUK_BALON, LEBAR_EKOR_MAX, LEBAR_EKOR_MIN, PANJANG_EKOR_MAX, PANJANG_EKOR_MIN, aturanEkor, balikEkor, ekorDariAturan, garisGerak, lingkaranAwan, titikGerigi, ukuranBentuk } from "@/lib/editor/bentuk-balon";
import { useEditor } from "@/lib/editor/store";
import type { Bubble, BentukBalon } from "@/lib/editor/types";

const W = 84;
const H = 52;

/** Gambar kecil sebuah bentuk balon (dari geometri yang sama dengan kanvas). */
function Ikon({ id }: { id: BentukBalon }) {
  const garis = { stroke: "#111", strokeWidth: 2.2, fill: "#fff", strokeLinejoin: "round" as const };
  const pad = 6;
  const w = W - pad * 2;
  const h = H - pad * 2;
  const isi = (() => {
    switch (id) {
      case "kotak":
        return (
          <>
            <rect x={pad + 3} y={pad + 3} width={w} height={h} rx={9} fill="#111" />
            <rect x={pad} y={pad} width={w} height={h} rx={9} {...garis} />
          </>
        );
      case "awan": {
        const { lingkaran, tengah } = lingkaranAwan(w, h);
        return (
          <g transform={`translate(${pad} ${pad})`}>
            {lingkaran.map((l, i) => (
              <circle key={`s${i}`} cx={l.x} cy={l.y} r={l.r} fill="none" stroke="#111" strokeWidth={4} />
            ))}
            <ellipse cx={tengah.x} cy={tengah.y} rx={tengah.rx} ry={tengah.ry} fill="none" stroke="#111" strokeWidth={4} />
            {lingkaran.map((l, i) => (
              <circle key={`f${i}`} cx={l.x} cy={l.y} r={l.r - 0.6} fill="#fff" />
            ))}
            <ellipse cx={tengah.x} cy={tengah.y} rx={tengah.rx} ry={tengah.ry} fill="#fff" />
          </g>
        );
      }
      case "ledakan":
      case "teriak": {
        const p = id === "ledakan" ? titikGerigi(w, h, 11, 0.62) : titikGerigi(w, h, 18, 0.8);
        return <polygon transform={`translate(${pad} ${pad})`} points={p.map((t) => `${t.x},${t.y}`).join(" ")} {...garis} strokeLinejoin="miter" />;
      }
      case "gerak":
        return (
          <>
            <ellipse cx={W / 2} cy={H / 2} rx={w / 2 - 2} ry={h / 2 - 2} {...garis} />
            <g transform={`translate(${pad + 2} ${pad + 2}) scale(${(w - 4) / w} ${(h - 4) / h})`}>
              {garisGerak(w, h).map((g, i) => (
                <line key={i} x1={g[0]} y1={g[1]} x2={g[2]} y2={g[3]} stroke="#111" strokeWidth={2.2} strokeLinecap="round" />
              ))}
            </g>
          </>
        );
      default:
        return <ellipse cx={W / 2} cy={H / 2} rx={w / 2} ry={h / 2} {...garis} />;
    }
  })();
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-12 w-full" aria-hidden="true">
      {isi}
    </svg>
  );
}

/** Pilihan bentuk balon dialog; memilih bentuk juga menyesuaikan jenis balon (awan = pikiran) dan memberi ruang bila bentuknya bergerigi. */
export function PilihBentukBalon({ bubble }: { bubble: Bubble }) {
  const update = useEditor((s) => s.updateBubble);
  if (bubble.kind === "narasi") return null;
  const aktif = bubble.bentuk ?? (bubble.kind === "pikir" ? "awan" : "oval");

  return (
    <div>
      <span className="font-semibold">Bentuk balon</span>
      <div className="mt-1 grid grid-cols-3 gap-2">
        {BENTUK_BALON.map((b) => (
          <button
            key={b.id}
            type="button"
            title={b.nama}
            aria-label={b.nama}
            aria-pressed={aktif === b.id}
            onClick={() => {
              const ukuran = ukuranBentuk(b.id, bubble.w, bubble.h);
              update(bubble.id, { bentuk: b.id, kind: b.jenis, tail: bubble.tail ?? { dx: 20, dy: ukuran.h / 2 + 40 }, ...ukuran });
            }}
            className={`rounded-lg border p-1 ${aktif === b.id ? "border-brand ring-2 ring-brand/40" : "border-line hover:bg-surface-muted"}`}
            style={{ background: "#e9edf2" }}
          >
            <Ikon id={b.id} />
          </button>
        ))}
      </div>
    </div>
  );
}

const JEDA_MS = 300;

/** Pengaturan ekor balon: nyalakan, balik kiri-kanan, arah, panjang, dan lebar pangkal. Geser slider disimpan sebagai satu langkah riwayat. */
export function PengaturanEkor({ bubble }: { bubble: Bubble }) {
  const update = useEditor((s) => s.updateBubble);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tail = bubble.tail;
  const [draf, setDraf] = useState(() => (tail ? aturanEkor(bubble.w, bubble.h, tail) : null));

  // ikuti perubahan dari luar (undo, seret ujung ekor di kanvas), kecuali saat guru sedang menggeser slider
  useEffect(() => {
    if (!timer.current) setDraf(tail ? aturanEkor(bubble.w, bubble.h, tail) : null);
  }, [tail, bubble.w, bubble.h]);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  if (bubble.kind === "narasi") return null;

  const ubah = (patch: Partial<{ arah: number; panjang: number; lebar: number }>) => {
    if (!draf) return;
    const baru = { ...draf, ...patch };
    setDraf(baru);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      update(bubble.id, { tail: ekorDariAturan(bubble.w, bubble.h, baru.arah, baru.panjang, baru.lebar) });
    }, JEDA_MS);
  };
  const geser = "mt-1 w-full accent-brand";

  return (
    <div className="space-y-3">
      <label className="flex items-center justify-between">
        <span className="font-semibold">Ekor balon</span>
        <input type="checkbox" checked={!!tail} onChange={(e) => update(bubble.id, { tail: e.target.checked ? { dx: 20, dy: bubble.h / 2 + 40 } : null })} />
      </label>
      {tail && draf && (
        <div className="space-y-3 rounded-lg border border-line p-3 text-xs">
          <button
            type="button"
            onClick={() => update(bubble.id, { tail: balikEkor(tail) })}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 font-semibold hover:bg-surface-muted"
          >
            <FlipHorizontal2 size={14} /> Balik ekor
          </button>
          <label className="block">
            <span className="text-gray-600">Arah ekor: {draf.arah}°</span>
            <input type="range" min={0} max={360} value={draf.arah} onChange={(e) => ubah({ arah: Number(e.target.value) })} className={geser} />
          </label>
          <label className="block">
            <span className="text-gray-600">Panjang ekor: {draf.panjang}</span>
            <input type="range" min={PANJANG_EKOR_MIN} max={PANJANG_EKOR_MAX} value={Math.min(PANJANG_EKOR_MAX, Math.max(PANJANG_EKOR_MIN, draf.panjang))} onChange={(e) => ubah({ panjang: Number(e.target.value) })} className={geser} />
          </label>
          <label className="block">
            <span className="text-gray-600">Lebar pangkal ekor: {Math.round(draf.lebar)}</span>
            <input type="range" min={LEBAR_EKOR_MIN} max={LEBAR_EKOR_MAX} value={Math.min(LEBAR_EKOR_MAX, Math.max(LEBAR_EKOR_MIN, draf.lebar))} onChange={(e) => ubah({ lebar: Number(e.target.value) })} className={geser} />
          </label>
          <p className="text-gray-500">Ujung ekor juga bisa diseret langsung di kanvas.</p>
        </div>
      )}
    </div>
  );
}
