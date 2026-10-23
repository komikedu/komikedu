/**
 * Latar dekoratif berupa tampilan editor yang dikaburkan dan digelapkan, di belakang dialog wizard
 * (seperti Anifusion): pengguna merasa sedang membuka editor, bukan halaman biasa. Tidak interaktif.
 */
export function EditorBackdrop() {
  const blok = "rounded bg-gray-200";
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden bg-canvas select-none">
      {/* panel kiri: judul, halaman, layer */}
      <div className="absolute inset-y-0 left-0 w-64 border-r border-line bg-surface p-4">
        <div className={`${blok} h-4 w-40`} />
        <div className={`${blok} mt-2 h-3 w-20`} />
        <div className="mt-6 grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-[3/4] rounded border border-line bg-surface-muted" />
          ))}
        </div>
        <div className="mt-6 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`${blok} h-3`} style={{ width: `${90 - i * 12}%` }} />
          ))}
        </div>
      </div>

      {/* kanvas: halaman putih dengan panel */}
      <div className="absolute inset-y-0 left-64 right-80 grid place-items-center">
        <div className="relative aspect-[3/4] h-[78%] bg-white shadow-xl">
          <div className="absolute left-[6%] right-[6%] top-[4.5%] h-[40%] border-2 border-gray-800/70 bg-gray-100" />
          <div className="absolute bottom-[4.5%] left-[6%] h-[48%] w-[42.5%] border-2 border-gray-800/70 bg-gray-100" />
          <div className="absolute bottom-[4.5%] right-[6%] h-[48%] w-[42.5%] border-2 border-gray-800/70 bg-gray-100" />
        </div>
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-3 rounded-2xl bg-surface px-4 py-2 shadow-lg ring-1 ring-line">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`${blok} h-9 w-9 ${i === 0 ? "bg-brand/40" : ""}`} />
          ))}
        </div>
      </div>

      {/* panel kanan: tab dan pengaturan */}
      <div className="absolute inset-y-0 right-0 w-80 border-l border-line bg-surface p-4">
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-muted p-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-7 rounded-md ${i === 0 ? "bg-surface shadow-sm" : ""}`} />
          ))}
        </div>
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded border border-line p-2">
              <div className={`${blok} h-3 w-16`} />
              <div className={`${blok} mt-2 h-3 w-full`} />
              <div className={`${blok} mt-1.5 h-3 w-4/5`} />
            </div>
          ))}
        </div>
        <div className="mt-6 h-10 rounded-lg bg-brand/40" />
      </div>

      <div className="absolute inset-0 bg-black/50 backdrop-blur-[6px]" />
    </div>
  );
}
