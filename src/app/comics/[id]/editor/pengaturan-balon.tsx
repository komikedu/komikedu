"use client";

import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, MessageCircle, Square, Type } from "lucide-react";
import { FONT_BALON, FONT_BALON_MAKS, FONT_BALON_MIN, GARIS_MAKS, MODE_BALON, RADIUS_MAKS, STROKE_MAKS, gayaTerpakai } from "@/lib/editor/gaya-balon";
import { useEditor } from "@/lib/editor/store";
import type { Bubble, GayaBalon, ModeBalon } from "@/lib/editor/types";
import { FONT_GAYA } from "./font-gaya";
import { PengaturanEkor, PetunjukPilihBanyak, PilihBentukBalon } from "./pilih-bentuk-balon";

const IKON_MODE: Record<ModeBalon, React.ReactNode> = {
  teks: <Type size={18} />,
  kotak: <Square size={18} />,
  balon: <MessageCircle size={18} />,
};

const tombolKecil = "grid h-9 w-8 place-items-center rounded-lg border text-sm";
const aktifKelas = "border-brand bg-brand text-brand-foreground";
const biasaKelas = "border-line hover:bg-surface-muted";

/** Satu baris slider dengan kotak angka di kanannya. */
function SliderAngka({ label, id, min, max, nilai, onUbah }: { label: string; id: string; min: number; max: number; nilai: number; onUbah: (n: number) => void }) {
  const batas = (n: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
  return (
    <div>
      <label htmlFor={id} className="text-xs text-gray-600">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-3">
        <input id={id} type="range" min={min} max={max} value={nilai} onChange={(e) => onUbah(Number(e.target.value))} className="min-w-0 flex-1 accent-brand" />
        <input
          type="number"
          aria-label={`${label} (angka)`}
          min={min}
          max={max}
          value={nilai}
          onChange={(e) => onUbah(batas(Number(e.target.value)))}
          className="h-9 w-16 rounded-lg border border-line px-2 text-center text-sm"
        />
      </div>
    </div>
  );
}

/**
 * Pengaturan lengkap sebuah balon: huruf (tebal, miring, vertikal, rata, font, ukuran), rupa (teks saja, kotak, atau balon),
 * isi teks, warna dan putaran, gaya balon, serta latar dan garis tepi.
 */
export function PengaturanBalon({ bubble }: { bubble: Bubble }) {
  const update = useEditor((s) => s.updateBubble);
  const g = gayaTerpakai(bubble);
  const ubahGaya = (patch: Partial<GayaBalon>) => update(bubble.id, { gaya: { ...bubble.gaya, ...patch } });

  function pilihMode(mode: ModeBalon) {
    if (mode === g.mode) return;
    if (mode === "balon") {
      update(bubble.id, {
        kind: bubble.bentuk === "awan" ? "pikir" : "bicara",
        tail: bubble.tail ?? { dx: 20, dy: bubble.h / 2 + 40 },
        gaya: { ...bubble.gaya, mode: undefined, warnaLatar: bubble.gaya?.warnaLatar },
      });
    } else {
      // teks dan kotak tidak punya ekor; kotak baru berlatar putih seperti balon, kecuali guru sudah memilih warna
      update(bubble.id, { kind: "narasi", tail: null, gaya: { ...bubble.gaya, mode, warnaLatar: bubble.gaya?.warnaLatar ?? (mode === "kotak" ? "#ffffff" : undefined) } });
    }
  }

  const tanpaLatar = g.mode === "teks";

  return (
    <div className="space-y-4 text-sm">
      <div>
        <h3 className="font-semibold">Pengaturan teks</h3>
        <div className="mt-2 flex items-center gap-1">
          <button type="button" aria-label="Tebal" aria-pressed={g.tebal} onClick={() => ubahGaya({ tebal: !g.tebal })} className={`${tombolKecil} ${g.tebal ? aktifKelas : biasaKelas}`}>
            <Bold size={16} />
          </button>
          <button type="button" aria-label="Miring" aria-pressed={g.miring} onClick={() => ubahGaya({ miring: !g.miring })} className={`${tombolKecil} ${g.miring ? aktifKelas : biasaKelas}`}>
            <Italic size={16} />
          </button>
          <button
            type="button"
            aria-pressed={g.vertikal}
            onClick={() => ubahGaya({ vertikal: !g.vertikal })}
            className={`h-9 rounded-lg border px-3 text-xs font-semibold ${g.vertikal ? aktifKelas : biasaKelas}`}
          >
            Vertikal
          </button>
          <span className="mx-0.5 h-6 w-px bg-line" />
          {(
            [
              ["left", "Rata kiri", <AlignLeft key="l" size={16} />],
              ["center", "Rata tengah", <AlignCenter key="c" size={16} />],
              ["right", "Rata kanan", <AlignRight key="r" size={16} />],
            ] as const
          ).map(([nilai, nama, ikon]) => (
            <button key={nilai} type="button" aria-label={nama} aria-pressed={g.rata === nilai && !g.vertikal} disabled={g.vertikal} onClick={() => ubahGaya({ rata: nilai })} className={`${tombolKecil} disabled:opacity-40 ${g.rata === nilai && !g.vertikal ? aktifKelas : biasaKelas}`}>
              {ikon}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <select
          aria-label="Font"
          value={g.font}
          onChange={(e) => ubahGaya({ font: e.target.value })}
          className="h-10 w-full rounded-lg border border-line bg-white px-2"
          style={{ fontFamily: FONT_GAYA[FONT_BALON.find((f) => f.id === g.font)?.kunci ?? "comic"] }}
        >
          {FONT_BALON.map((f) => (
            <option key={f.id} value={f.id} style={{ fontFamily: FONT_GAYA[f.kunci] }}>
              {f.nama}
            </option>
          ))}
        </select>
        <SliderAngka label="Ukuran huruf" id="ukuran-huruf-balon" min={FONT_BALON_MIN} max={FONT_BALON_MAKS} nilai={bubble.fontSize} onUbah={(n) => update(bubble.id, { fontSize: n })} />
      </div>

      <div>
        <span className="sr-only">Rupa</span>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Rupa teks">
          {MODE_BALON.map((m) => (
            <button key={m.id} type="button" aria-pressed={g.mode === m.id} onClick={() => pilihMode(m.id)} className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-semibold ${g.mode === m.id ? aktifKelas : biasaKelas}`}>
              {IKON_MODE[m.id]}
              {m.nama}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="teks-balon" className="sr-only">
          Teks
        </label>
        <textarea
          id="teks-balon"
          rows={4}
          maxLength={300}
          value={bubble.text}
          onChange={(e) => update(bubble.id, { text: e.target.value })}
          placeholder="Tulis teks..."
          className="w-full rounded-lg border border-line px-3 py-2"
        />
        <p className="text-right text-xs text-gray-500">{bubble.text.length} / 300</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2">
          <input type="color" value={g.warnaTeks} onChange={(e) => ubahGaya({ warnaTeks: e.target.value })} className="h-9 w-10 cursor-pointer rounded border border-line" />
          <span className="font-semibold">Warna teks</span>
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-600">
          Putar
          <input
            type="number"
            aria-label="Putar (derajat)"
            min={-180}
            max={180}
            value={g.rotasi}
            onChange={(e) => ubahGaya({ rotasi: Math.min(180, Math.max(-180, Math.round(Number(e.target.value) || 0))) })}
            className="h-9 w-16 rounded-lg border border-line px-2 text-center text-sm"
          />
          °
        </label>
      </div>

      <div className="space-y-3 border-t border-line pt-4">
        <label className="flex items-center justify-between">
          <span className="font-semibold">Efek stroke pada huruf</span>
          <input type="checkbox" role="switch" aria-label="Aktifkan stroke" checked={g.stroke} onChange={(e) => ubahGaya({ stroke: e.target.checked })} className="h-4 w-4 accent-brand" />
        </label>
        {g.stroke && (
          <div className="flex items-end gap-3">
            <label className="flex flex-col items-center gap-1 text-xs text-gray-600">
              <input type="color" aria-label="Warna stroke" value={g.warnaStroke} onChange={(e) => ubahGaya({ warnaStroke: e.target.value })} className="h-9 w-10 cursor-pointer rounded border border-line" />
              Warna
            </label>
            <div className="min-w-0 flex-1">
              <SliderAngka label="Tebal stroke" id="tebal-stroke-balon" min={0} max={STROKE_MAKS} nilai={g.tebalStroke} onUbah={(n) => ubahGaya({ tebalStroke: n })} />
            </div>
          </div>
        )}
      </div>

      {g.mode === "balon" && (
        <>
          <PetunjukPilihBanyak />
          <PilihBentukBalon bubble={bubble} />
        </>
      )}

      {!tanpaLatar && (
        <div className="space-y-3 border-t border-line pt-4">
          <h3 className="font-semibold">Latar</h3>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <label className="flex items-center gap-2">
              <input type="color" value={g.warnaLatar} onChange={(e) => ubahGaya({ warnaLatar: e.target.value })} className="h-9 w-10 cursor-pointer rounded border border-line" />
              <span className="text-xs text-gray-600">Warna latar</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="color" value={g.warnaGaris} onChange={(e) => ubahGaya({ warnaGaris: e.target.value })} className="h-9 w-10 cursor-pointer rounded border border-line" />
              <span className="text-xs text-gray-600">Warna garis</span>
            </label>
          </div>
          <SliderAngka label="Tebal garis" id="tebal-garis-balon" min={0} max={GARIS_MAKS} nilai={g.tebalGaris} onUbah={(n) => ubahGaya({ tebalGaris: n })} />
          {g.mode === "kotak" && <SliderAngka label="Sudut membulat" id="radius-kotak-balon" min={0} max={RADIUS_MAKS} nilai={g.radius} onUbah={(n) => ubahGaya({ radius: n })} />}
        </div>
      )}

      {g.mode === "balon" && <PengaturanEkor key={bubble.id} bubble={bubble} />}
    </div>
  );
}
