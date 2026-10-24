"use client";

/**
 * Saklar nyala/mati untuk pengaturan di panel samping. Seluruh barisnya bisa diklik. `keterangan` adalah label baris;
 * `deskripsi` (opsional) teks kecil di bawahnya.
 */
export function Saklar({ aktif, onUbah, keterangan, deskripsi, disabled }: { aktif: boolean; onUbah: (aktif: boolean) => void; keterangan: string; deskripsi?: string; disabled?: boolean }) {
  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={aktif}
        disabled={disabled}
        onClick={() => onUbah(!aktif)}
        className="flex w-full items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="font-semibold">{keterangan}</span>
        <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${aktif ? "bg-brand" : "bg-gray-300"}`}>
          <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${aktif ? "translate-x-5" : "translate-x-0"}`} />
        </span>
      </button>
      {deskripsi && <p className="mt-1 text-xs text-gray-500">{deskripsi}</p>}
    </div>
  );
}
