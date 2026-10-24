import { layoutForPanelCount } from "@/lib/ai/layouts";
import { ringkasSusunan, type PratinjauProps } from "@/lib/comics/susunan";

/** Contoh jumlah panel bergantian untuk menggambarkan "Otomatis" (AI memilih 2 sampai 4 panel per halaman). */
const CONTOH_OTOMATIS = [3, 2, 4, 3, 2, 4, 3, 2];

/** Berapa halaman isi yang digambar di pratinjau; sisanya diringkas "+n". */
const MAKS_TAMPIL = 8;
const OTOMATIS_TAMPIL = 6;

/**
 * Gambar kecil sebuah halaman komik: kotak berbentuk halaman dengan panel-panelnya (dari template layout yang sama dengan
 * editor), atau sampul bergaya poster dengan ruang judul. Hanya ilustrasi, bukan isi komik.
 */
export function MiniHalaman({ panel, sampul = false, tinggi = 88, rasio = 3 / 4 }: { panel?: number; sampul?: boolean; tinggi?: number; rasio?: number }) {
  const gaya = { height: tinggi, aspectRatio: String(rasio) };
  if (sampul) {
    return (
      <span aria-hidden="true" style={gaya} className="relative block shrink-0 overflow-hidden rounded-sm border border-gray-400 bg-gradient-to-b from-sky-200 to-emerald-100 shadow-sm">
        <span className="absolute inset-x-[12%] top-[7%] h-[17%] rounded-sm border border-amber-500 bg-amber-300" />
        <span className="absolute bottom-[10%] left-[24%] h-[34%] w-[22%] rounded-full bg-rose-300" />
        <span className="absolute bottom-[10%] left-[52%] h-[30%] w-[20%] rounded-full bg-indigo-300" />
      </span>
    );
  }
  const rects = layoutForPanelCount(panel ?? 3).panels;
  return (
    <span aria-hidden="true" style={gaya} className="relative block shrink-0 overflow-hidden rounded-sm border border-gray-400 bg-white shadow-sm">
      <span className="absolute inset-[7%] block">
        {rects.map((r, i) => (
          <span
            key={i}
            className="absolute border border-gray-500/70 bg-gray-200"
            style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` }}
          />
        ))}
      </span>
    </span>
  );
}

/**
 * Pratinjau susunan komik yang berubah mengikuti pilihan: deretan halaman (sampul bila diaktifkan), panel per halaman, dan
 * bentuk halaman. Memberi gambaran cepat tanpa harus membayangkan angka.
 */
export function PratinjauKomik(p: PratinjauProps) {
  const rasio = Math.max(0.5, Math.min(2, p.lebar / p.tinggi));
  // tinggi halaman mini tetap; lebar mengikuti bentuk halaman, dibatasi agar tidak terlalu lebar
  const tinggiMini = rasio > 1.2 ? 56 : 84;
  const otomatis = p.jumlahHalaman === null;
  const tampil = otomatis ? OTOMATIS_TAMPIL : Math.min(p.jumlahHalaman ?? 0, MAKS_TAMPIL);
  const sisa = otomatis ? 0 : (p.jumlahHalaman ?? 0) - tampil;
  // jumlah panel tiap halaman: tetap, bergantian dalam rentang, atau contoh bergantian untuk otomatis
  const rentang = p.panelPerHalaman !== null && p.panelMaks != null && p.panelMaks > p.panelPerHalaman;
  const panelHalaman = (i: number) =>
    rentang ? p.panelPerHalaman! + ((i * 2 + 1) % (p.panelMaks! - p.panelPerHalaman! + 1)) : (p.panelPerHalaman ?? CONTOH_OTOMATIS[i % CONTOH_OTOMATIS.length]);

  return (
    <figure className="rounded-xl bg-surface-muted p-4" aria-label="Pratinjau susunan komik">
      <figcaption className="text-xs font-medium text-gray-600">Pratinjau susunan komikmu</figcaption>
      <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-3">
        {p.sampul && (
          <span className="flex shrink-0 flex-col items-center gap-1">
            <MiniHalaman sampul tinggi={tinggiMini} rasio={rasio} />
            <span className="text-[10px] font-medium text-gray-500">Sampul</span>
          </span>
        )}
        {Array.from({ length: tampil }, (_, i) => (
          <span key={i} className="flex shrink-0 flex-col items-center gap-1">
            <MiniHalaman panel={panelHalaman(i)} tinggi={tinggiMini} rasio={rasio} />
            <span className="text-[10px] text-gray-500">{i + 1}</span>
          </span>
        ))}
        {(sisa > 0 || otomatis) && (
          <span className="flex shrink-0 flex-col items-center gap-1 self-center px-1 text-gray-500">
            <span className="text-lg leading-none">…</span>
            <span className="text-[10px] font-medium">{otomatis ? "4–12" : `+${sisa}`}</span>
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-gray-600">{ringkasSusunan(p)}</p>
    </figure>
  );
}
