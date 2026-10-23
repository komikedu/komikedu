"use client";

import { Trash2 } from "lucide-react";
import { FONT_MAX, FONT_MIN, GAYA_TEKS, MAKS_TEKS, burstTeks, gayaTeks, lapisanTeks } from "@/lib/editor/gaya-teks";
import { useEditor } from "@/lib/editor/store";
import type { ElemenStiker, ElemenTeks, MathElement } from "@/lib/editor/types";
import { FONT_GAYA } from "./font-gaya";

/** Geser sudut putar elemen (derajat), dengan tombol kembali ke tegak. */
export function Putaran({ el }: { el: MathElement }) {
  const update = useEditor((s) => s.updateElement);
  const sudut = Math.round(el.rotasi ?? 0);
  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor="putar-elemen" className="font-semibold">
          Putar: {sudut}°
        </label>
        {sudut !== 0 && (
          <button type="button" onClick={() => update(el.id, { rotasi: 0 })} className="text-xs text-gray-500 hover:text-brand">
            Tegakkan
          </button>
        )}
      </div>
      <input id="putar-elemen" type="range" min={-180} max={180} value={sudut} onChange={(e) => update(el.id, { rotasi: Number(e.target.value) })} className="mt-1 w-full accent-violet-600" />
    </div>
  );
}

/** Pilihan elemen terikat ke panelnya (ikut pindah, tersalin, dan terhapus bersama panel) atau bebas di halaman. */
export function IkatPanel({ el }: { el: MathElement }) {
  const ikat = useEditor((s) => s.ikatElemen);
  const bebas = el.panelId === null;
  return (
    <div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={bebas} onChange={(e) => ikat(el.id, e.target.checked)} className="h-4 w-4 accent-violet-600" />
        <span className="font-semibold">Bebas di halaman</span>
      </label>
      <p className="mt-1 text-xs text-gray-500">
        {bebas ? "Tidak ikut pindah atau terhapus bersama panel. Hilangkan centang untuk mengikat ke panel di bawahnya." : "Ikut pindah, tersalin, dan terhapus bersama panelnya. Centang agar bisa ditaruh di mana saja, mis. judul di atas halaman."}
      </p>
    </div>
  );
}

/** Cuplikan gaya di tombol: huruf gaya dengan warna isi dan garis tepi yang mirip. */
function Cuplikan({ id }: { id: string }) {
  const g = gayaTeks(id);
  const lap = lapisanTeks({ gaya: id });
  const isi = lap[lap.length - 1];
  const tepi = lap.find((l) => l.stroke && l !== isi) ?? isi;
  return (
    <span
      className="block truncate text-center text-lg leading-tight"
      style={{
        fontFamily: FONT_GAYA[g.font],
        fontWeight: g.font === "comic" ? 700 : 400,
        color: isi.fill,
        WebkitTextStroke: tepi.stroke ? `2px ${tepi.stroke}` : undefined,
        paintOrder: "stroke fill",
      }}
    >
      {g.contoh}
    </span>
  );
}

/** Pengaturan teks bergaya: isi, gaya, ukuran huruf, warna isi, dan putaran. */
export function TeksTab({ el }: { el: ElemenTeks }) {
  const update = useEditor((s) => s.updateElement);
  const del = useEditor((s) => s.deleteElement);
  const warnaBawaan = gayaTeks(el.gaya).lapisan.at(-1)!.fill;

  return (
    <div className="space-y-4 p-4 text-sm">
      <div>
        <h3 className="font-semibold">Teks bergaya</h3>
        <p className="mt-1 text-xs text-gray-500">Untuk judul dan efek suara. Seret untuk memindah, tarik sudut untuk mengubah ukuran, tarik titik di atas untuk memutar.</p>
      </div>
      <div>
        <label htmlFor="isi-teks" className="font-semibold">
          Tulisan
        </label>
        <input
          id="isi-teks"
          value={el.text}
          maxLength={MAKS_TEKS}
          onChange={(e) => update(el.id, { text: e.target.value })}
          className="mt-1 h-9 w-full rounded-lg border border-line px-2"
        />
      </div>
      <div>
        <span className="font-semibold">Gaya</span>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {GAYA_TEKS.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={el.gaya === g.id}
              aria-label={g.nama}
              title={g.nama}
              onClick={() => update(el.id, { gaya: g.id, warna: undefined, latarBurst: undefined, ...(g.burst && el.h < el.w * 0.55 ? { h: Math.round(el.w * 0.75) } : {}) })}
              className={`rounded-lg border px-2 py-2 ${el.gaya === g.id ? "border-violet-600 ring-2 ring-violet-600/40" : "border-line hover:bg-surface-muted"}`}
              style={{ background: g.burst?.isi ?? "#e9edf2" }}
            >
              <Cuplikan id={g.id} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="ukuran-teks" className="font-semibold">
          Ukuran huruf: {el.fontSize}
        </label>
        <input id="ukuran-teks" type="range" min={FONT_MIN} max={FONT_MAX} value={el.fontSize} onChange={(e) => update(el.id, { fontSize: Number(e.target.value) })} className="mt-1 w-full accent-violet-600" />
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2">
          <input type="color" value={el.warna ?? warnaBawaan} onChange={(e) => update(el.id, { warna: e.target.value })} className="h-8 w-10 cursor-pointer rounded border border-line" />
          <span className="font-semibold">Warna isi huruf</span>
        </label>
        {el.warna && (
          <button type="button" onClick={() => update(el.id, { warna: undefined })} className="text-xs text-gray-500 hover:text-brand">
            Bawaan gaya
          </button>
        )}
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={!!burstTeks(el)} onChange={(e) => update(el.id, { latarBurst: e.target.checked })} className="h-4 w-4 accent-violet-600" />
        <span className="font-semibold">Latar burst</span>
      </label>
      <Putaran el={el} />
      <IkatPanel el={el} />
      <button type="button" onClick={() => del(el.id)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-danger hover:bg-surface-muted">
        <Trash2 size={14} /> Hapus teks
      </button>
    </div>
  );
}

/** Pengaturan stiker: ukuran diatur dengan menarik sudutnya di kanvas; di sini putar, ikat panel, dan hapus. */
export function StikerTab({ el }: { el: ElemenStiker }) {
  const del = useEditor((s) => s.deleteElement);
  return (
    <div className="space-y-4 p-4 text-sm">
      <div>
        <h3 className="font-semibold">Stiker</h3>
        <p className="mt-1 text-xs text-gray-500">Seret untuk memindah, tarik sudut untuk mengubah ukuran, tarik titik di atas untuk memutar.</p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={el.url} alt="" crossOrigin="anonymous" className="mx-auto max-h-40 rounded-lg border border-line bg-surface-muted object-contain" />
      <Putaran el={el} />
      <IkatPanel el={el} />
      <button type="button" onClick={() => del(el.id)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-danger hover:bg-surface-muted">
        <Trash2 size={14} /> Hapus stiker
      </button>
    </div>
  );
}
