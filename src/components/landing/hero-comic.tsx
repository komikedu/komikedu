import Image from "next/image";

type Balon = {
  teks: string;
  /** posisi dan lebar dalam persen terhadap halaman */
  x: number;
  y: number;
  w: number;
  jenis: "bicara" | "pikir";
  /** posisi ekor (persen dari lebar balon) */
  ekor?: number;
  terpilih?: boolean;
};

const BALON: Balon[] = [
  { teks: "Lampu merah menyala tiap 4 detik, lampu biru tiap 6 detik!", x: 5, y: 9, w: 38, jenis: "bicara", ekor: 55 },
  { teks: "Kapan nyala bersamaan, ya?", x: 22, y: 53.5, w: 25, jenis: "pikir", terpilih: true },
  { teks: "KPK dari 4 dan 6 itu 12. Tiap 12 detik!", x: 55, y: 53.5, w: 38, jenis: "bicara", ekor: 40 },
];

/**
 * Contoh halaman komik: gambar dibuat AI tanpa teks, balon dialog adalah teks biasa di atasnya.
 * Ini menunjukkan keunggulan utama: teks selalu rapi dan bisa diedit.
 */
export function HeroComic({ fontClass }: { fontClass: string }) {
  return (
    <figure className="relative mx-auto w-full max-w-[420px]">
      <div className="relative overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-black/10">
        <Image
          src="/landing/halaman-contoh.webp"
          alt="Contoh halaman komik KPK: Kiki dan Doni mengamati lampu hias yang menyala bergantian di depan toko kue."
          width={720}
          height={964}
          priority
          className="h-auto w-full"
        />
        {BALON.map((b) => (
          <div
            key={b.teks}
            className={`absolute ${fontClass}`}
            style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%` }}
          >
            <div
              className={`relative border-2 border-black bg-white text-center text-[9px] font-bold leading-tight text-black sm:text-[11px] ${
                b.jenis === "pikir" ? "rounded-2xl px-2.5 py-1.5" : "rounded-[50%] px-4 py-2.5 sm:px-5"
              } ${b.terpilih ? "outline outline-2 outline-offset-4 outline-dashed outline-brand" : ""}`}
            >
              {b.teks}
            </div>
            {b.jenis === "bicara" ? (
              <svg viewBox="0 0 20 14" className="absolute -bottom-[11px] h-3.5 w-5" style={{ left: `${b.ekor ?? 50}%` }} aria-hidden>
                <path d="M2 0 L10 13 L14 0" fill="white" stroke="black" strokeWidth="2" strokeLinejoin="round" />
                <path d="M3 0 L13 0" stroke="white" strokeWidth="3" />
              </svg>
            ) : (
              <span aria-hidden className="absolute -bottom-3 left-4 h-2 w-2 rounded-full border-2 border-black bg-white" />
            )}
            {b.terpilih && (
              <span className="absolute -top-6 left-0 whitespace-nowrap rounded bg-brand px-1.5 py-0.5 font-sans text-[10px] font-medium text-brand-foreground">
                Teks bisa diedit
              </span>
            )}
          </div>
        ))}
      </div>
      <figcaption className="mt-3 text-center text-xs text-gray-500">Contoh halaman yang dibuat dengan KomikEdu. Gambar oleh AI, teks oleh guru.</figcaption>
    </figure>
  );
}
