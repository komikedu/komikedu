"use client";

import { useState } from "react";
import { TokohDetail } from "@/app/comics/[id]/editor/tokoh-detail";
import { fromPreset, TOKOH_PRESET, type Tokoh } from "@/lib/comics/tokoh";

export function DevTokoh() {
  const [tokoh, setTokoh] = useState<Tokoh[]>([
    { id: "sendiri-1", nama: "Siti", peran: "", deskripsi: "siswi perempuan 8 tahun, berkerudung putih berpita merah, seragam SD putih-merah, membawa buku catatan bersampul bunga", preset: false, potret: "/tokoh/sari-kartun-cerah.webp" },
    fromPreset(TOKOH_PRESET[0]),
  ]);
  const [id, setId] = useState<string | null>("sendiri-1");
  const [saldo, setSaldo] = useState(13);
  return (
    <div className="p-6">
      <div className="flex gap-2">
        {tokoh.map((t) => (
          <button key={t.id} type="button" onClick={() => setId(t.id)} className="rounded border border-line px-3 py-1.5 text-sm">
            Buka {t.nama}
          </button>
        ))}
      </div>
      {id && <TokohDetail comicId="00000000-0000-4000-8000-000000000000" tokohId={id} tokoh={tokoh} setTokoh={setTokoh} gaya="kartun-cerah" saldo={saldo} setSaldo={setSaldo} onClose={() => setId(null)} />}
    </div>
  );
}
