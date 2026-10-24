"use client";

import { useEffect, useRef, useState } from "react";
import { FlipHorizontal2 } from "lucide-react";
import { BENTUK_BALON, LEBAR_EKOR_MAX, LEBAR_EKOR_MIN, PANJANG_EKOR_MAX, PANJANG_EKOR_MIN, aturanEkor, balikEkor, ekorDariAturan, garisGerak, lingkaranAwan, titikGerigi, ukuranBentuk } from "@/lib/editor/bentuk-balon";
import { gayaTerpakai } from "@/lib/editor/gaya-balon";
import { useEditor } from "@/lib/editor/store";
import { Saklar } from "./saklar";
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

/** Perubahan satu balon saat bentuknya diganti: jenis menyesuaikan (awan = pikiran), ekor dipertahankan, dan ruang diperbesar bila perlu. */
function perubahanBentuk(bubble: Bubble, bentuk: BentukBalon, jenis: "bicara" | "pikir") {
  const ukuran = ukuranBentuk(bentuk, bubble.w, bubble.h);
  return { bentuk, kind: jenis, tail: bubble.tail ?? { dx: 20, dy: ukuran.h / 2 + 40 }, ...ukuran };
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
            onClick={() => update(bubble.id, perubahanBentuk(bubble, b.id, b.jenis))}
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
  const gayaEkor = gayaTerpakai(bubble).ekor;
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
      <Saklar keterangan="Ekor balon" aktif={!!tail} onUbah={(v) => update(bubble.id, { tail: v ? { dx: 20, dy: bubble.h / 2 + 40 } : null })} />
      {tail && draf && (
        <div className="space-y-3 rounded-lg border border-line p-3 text-xs">
          <button
            type="button"
            onClick={() => update(bubble.id, { tail: balikEkor(tail) })}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 font-semibold hover:bg-surface-muted"
          >
            <FlipHorizontal2 size={14} /> Balik ekor
          </button>
          {bubble.bentuk !== "awan" && (
            <div role="group" aria-label="Gaya ekor" className="grid grid-cols-2 gap-2">
              {(
                [
                  ["lancip", "Lancip"],
                  ["pikir", "Pikiran"],
                ] as const
              ).map(([nilai, nama]) => (
                <button
                  key={nilai}
                  type="button"
                  aria-pressed={gayaEkor === nilai}
                  onClick={() => update(bubble.id, { gaya: { ...bubble.gaya, ekor: nilai } })}
                  className={`rounded-lg border px-2 py-2 font-semibold ${gayaEkor === nilai ? "border-brand bg-brand text-brand-foreground" : "border-line hover:bg-surface-muted"}`}
                >
                  {nama}
                </button>
              ))}
            </div>
          )}
          <label className="block">
            <span className="text-gray-600">Arah ekor: {draf.arah}°</span>
            <input type="range" min={0} max={360} value={draf.arah} onChange={(e) => ubah({ arah: Number(e.target.value) })} className={geser} />
          </label>
          <label className="block">
            <span className="text-gray-600">Panjang ekor: {draf.panjang}</span>
            <input type="range" min={PANJANG_EKOR_MIN} max={PANJANG_EKOR_MAX} value={Math.min(PANJANG_EKOR_MAX, Math.max(PANJANG_EKOR_MIN, draf.panjang))} onChange={(e) => ubah({ panjang: Number(e.target.value) })} className={geser} />
          </label>
          {gayaEkor === "lancip" && bubble.bentuk !== "awan" && (
          <label className="block">
            <span className="text-gray-600">Lebar pangkal ekor: {Math.round(draf.lebar)}</span>
            <input type="range" min={LEBAR_EKOR_MIN} max={LEBAR_EKOR_MAX} value={Math.min(LEBAR_EKOR_MAX, Math.max(LEBAR_EKOR_MIN, draf.lebar))} onChange={(e) => ubah({ lebar: Number(e.target.value) })} className={geser} />
          </label>
          )}
          <p className="text-gray-500">Ujung ekor juga bisa diseret langsung di kanvas.</p>
        </div>
      )}
    </div>
  );
}

/** Petunjuk dan pintasan memilih beberapa balon sekaligus, di tab satu balon. */
export function PetunjukPilihBanyak() {
  const semua = useEditor((s) => s.pilihSemuaBalon);
  const jumlah = useEditor((s) => s.pages.find((p) => p.id === s.activePageId)?.bubbles.filter((b) => b.visible).length ?? 0);
  if (jumlah < 2) return null;
  return (
    <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-gray-600">
      Tahan <kbd className="rounded border border-line bg-white px-1">Shift</kbd> lalu klik balon lain untuk memilih beberapa sekaligus, atau{" "}
      <button type="button" onClick={semua} className="font-semibold text-brand underline">
        pilih semua balon
      </button>
      .
    </p>
  );
}

/** Pengaturan bersama untuk beberapa balon yang dipilih: ukuran huruf, bentuk, dan hapus. Perubahan berlaku ke semuanya dalam satu langkah riwayat. */
export function BalonBanyak({ ids }: { ids: string[] }) {
  const balon = useEditor((s) => s.pages.find((p) => p.id === s.activePageId)?.bubbles ?? []);
  const ubah = useEditor((s) => s.updateBalonBanyak);
  const hapus = useEditor((s) => s.deleteBalonBanyak);
  const select = useEditor((s) => s.select);
  const update = useEditor((s) => s.updateBubble);
  const dipilih = balon.filter((b) => ids.includes(b.id));
  if (!dipilih.length) return null;

  const ukuran = new Set(dipilih.map((b) => b.fontSize));
  const sama = ukuran.size === 1;
  const nilai = dipilih[0].fontSize;
  const bukanNarasi = dipilih.filter((b) => b.kind !== "narasi");

  return (
    <div className="space-y-4 p-4 text-sm">
      <div>
        <h3 className="font-semibold">{dipilih.length} balon dipilih</h3>
        <p className="mt-1 text-xs text-gray-500">Perubahan di sini berlaku ke semua balon yang dipilih. Shift+klik balon untuk menambah atau melepas.</p>
      </div>

      <div>
        <label htmlFor="font-banyak" className="font-semibold">
          Ukuran huruf: {sama ? nilai : "bervariasi"}
        </label>
        <input id="font-banyak" type="range" min={10} max={96} value={nilai} onChange={(e) => ubah(ids, { fontSize: Number(e.target.value) })} className="mt-1 w-full accent-brand" />
        <div className="mt-1 flex gap-2">
          <button type="button" onClick={() => ubah(ids, { fontSize: Math.max(10, nilai - 2) })} className="flex-1 rounded-lg border border-line px-2 py-1.5 text-xs hover:bg-surface-muted">
            Kecilkan
          </button>
          <button type="button" onClick={() => ubah(ids, { fontSize: Math.min(96, nilai + 2) })} className="flex-1 rounded-lg border border-line px-2 py-1.5 text-xs hover:bg-surface-muted">
            Besarkan
          </button>
        </div>
        {!sama && <p className="mt-1 text-xs text-gray-500">Ukuran berbeda-beda. Menggeser slider menyamakan semuanya.</p>}
      </div>

      {bukanNarasi.length > 0 && (
        <div>
          <span className="font-semibold">Bentuk balon</span>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {BENTUK_BALON.map((b) => (
              <button
                key={b.id}
                type="button"
                title={b.nama}
                aria-label={b.nama}
                onClick={() => bukanNarasi.forEach((x) => update(x.id, perubahanBentuk(x, b.id, b.jenis)))}
                className="rounded-lg border border-line p-1 hover:bg-surface-muted"
                style={{ background: "#e9edf2" }}
              >
                <Ikon id={b.id} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={() => select(dipilih[0].id)} className="flex-1 rounded-lg border border-line px-3 py-2 text-xs font-semibold hover:bg-surface-muted">
          Batal pilih
        </button>
        <button type="button" onClick={() => hapus(ids)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-danger hover:bg-surface-muted">
          Hapus {dipilih.length} balon
        </button>
      </div>
    </div>
  );
}
