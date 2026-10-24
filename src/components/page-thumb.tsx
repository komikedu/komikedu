import { gayaGambar, gayaPanel, type HalamanThumb } from "@/lib/comics/thumb";
import { UKURAN_BAWAAN } from "@/lib/editor/types";

/** Thumbnail halaman komik: panel dan gambarnya ditaruh di posisi aslinya pada kertas putih seukuran halaman komik. */
export function PageThumb({ halaman }: { halaman: HalamanThumb }) {
  const { w, h } = halaman.ukuran ?? UKURAN_BAWAAN;
  return (
    <div aria-hidden className="relative w-full overflow-hidden bg-white" style={{ aspectRatio: `${w} / ${h}` }}>
      {halaman.panels.map((p, i) => (
        <div key={i} className="absolute overflow-hidden bg-gray-100 outline outline-1 -outline-offset-1 outline-gray-900/70" style={gayaPanel(p, halaman.ukuran)}>
          {p.imageUrl && (
            // crossOrigin: samakan mode CORS dengan kanvas editor supaya cache browser tidak menyimpan versi tanpa header CORS
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.imageUrl} alt="" crossOrigin="anonymous" draggable={false} className="absolute max-w-none select-none object-fill" style={gayaGambar(p)} />
          )}
        </div>
      ))}
    </div>
  );
}
