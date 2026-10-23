import { gayaGambar, gayaPanel, type HalamanThumb } from "@/lib/comics/thumb";

/** Thumbnail halaman komik: panel dan gambarnya ditaruh di posisi aslinya pada kertas putih rasio 3:4. */
export function PageThumb({ halaman }: { halaman: HalamanThumb }) {
  return (
    <div aria-hidden className="relative aspect-[3/4] w-full overflow-hidden bg-white">
      {halaman.panels.map((p, i) => (
        <div key={i} className="absolute overflow-hidden bg-gray-100 outline outline-1 -outline-offset-1 outline-gray-900/70" style={gayaPanel(p)}>
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
