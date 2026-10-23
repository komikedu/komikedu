"use client";

import { useEffect, useRef, useState } from "react";
import { aturanUkuran, cssLatar, gantiJenisLatar, JENIS_LATAR, pakaiSudut, PRESET_LATAR } from "@/lib/editor/latar-panel";
import { useEditor } from "@/lib/editor/store";
import type { JenisLatar, Latar } from "@/lib/editor/types";

const JEDA_MS = 400;

/** Bagian "Latar panel" di tab Panel: pilih pola siap pakai, lalu ubah warna, ukuran, dan sudutnya. */
export function LatarSection({ panelId, latar }: { panelId: string; latar: Latar | null | undefined }) {
  const setLatar = useEditor((s) => s.setLatar);
  const [draft, setDraft] = useState<Latar | null>(latar ?? null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ikuti perubahan dari luar (undo/redo, ganti panel), kecuali saat guru sedang menggeser kontrol
  useEffect(() => {
    if (!timer.current) setDraft(latar ?? null);
  }, [latar]);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const segera = (l: Latar | null) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setDraft(l);
    setLatar(panelId, l);
  };
  const tunda = (l: Latar) => {
    setDraft(l);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      setLatar(panelId, l);
    }, JEDA_MS);
  };

  const aturan = draft ? aturanUkuran(draft.jenis) : null;
  const dua = draft && draft.jenis !== "polos";

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-600">Latar panel</p>
        {draft && (
          <button type="button" onClick={() => segera(null)} className="text-xs text-gray-500 hover:text-danger">
            Tanpa pola
          </button>
        )}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {PRESET_LATAR.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.nama}
            aria-label={p.nama}
            onClick={() => segera(p.latar)}
            className="aspect-square rounded-md border border-line hover:ring-2 hover:ring-brand"
            style={cssLatar({ ...p.latar, ukuran: p.latar.jenis === "sinar" ? p.latar.ukuran : p.latar.ukuran / 3 }, 80, 80)}
          />
        ))}
      </div>

      {draft && (
        <div className="mt-3 space-y-2.5 rounded-lg border border-line p-3 text-xs">
          <label className="block">
            <span className="text-gray-600">Jenis pola</span>
            <select
              value={draft.jenis}
              onChange={(e) => segera(gantiJenisLatar(draft, e.target.value as JenisLatar))}
              className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1.5"
            >
              {JENIS_LATAR.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nama}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2">
              <input type="color" value={draft.warna1} onChange={(e) => tunda({ ...draft, warna1: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-line" />
              <span className="text-gray-600">{draft.jenis === "gradasi" ? "Warna awal" : "Warna dasar"}</span>
            </label>
            {dua && (
              <label className="flex items-center gap-2">
                <input type="color" value={draft.warna2} onChange={(e) => tunda({ ...draft, warna2: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-line" />
                <span className="text-gray-600">{draft.jenis === "gradasi" ? "Warna akhir" : "Warna motif"}</span>
              </label>
            )}
          </div>
          {aturan && (
            <label className="block">
              <span className="text-gray-600">
                {aturan.label}: {Math.round(draft.ukuran)}
              </span>
              <input type="range" min={aturan.min} max={aturan.max} value={Math.min(aturan.max, Math.max(aturan.min, draft.ukuran))} onChange={(e) => tunda({ ...draft, ukuran: Number(e.target.value) })} className="w-full accent-brand" />
            </label>
          )}
          {pakaiSudut(draft.jenis) && (
            <label className="block">
              <span className="text-gray-600">Sudut: {Math.round(draft.sudut)}°</span>
              <input type="range" min={0} max={360} value={draft.sudut} onChange={(e) => tunda({ ...draft, sudut: Number(e.target.value) })} className="w-full accent-brand" />
            </label>
          )}
        </div>
      )}
      <p className="mt-1.5 text-xs text-gray-500">Pola tampak di panel kosong atau di balik gambar yang transparan.</p>
    </div>
  );
}
