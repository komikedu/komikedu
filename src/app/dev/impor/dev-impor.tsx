"use client";

import { useEffect, useState } from "react";
import { createPage } from "@/lib/editor/factory";
import { DialogImporGambar } from "../../comics/[id]/editor/dialog-impor-gambar";

const NAMA = ["2-1.png", "1-2.png", "1-1.png", "Boy_clapping_proudly_20261023211230.png", "Girl_smiling_20261023211100.png", "9-9.png"];
const WARNA = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6"];

async function buatBerkas(nama: string, warna: string): Promise<File> {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = warna;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "#111";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(nama.slice(0, 4), 8, 38);
  const blob = await new Promise<Blob>((ok) => c.toBlob((b) => ok(b!), "image/png"));
  return new File([blob], nama, { type: "image/png" });
}

export function DevImpor() {
  const [pages] = useState(() => {
    const a = createPage("2-atas-bawah", ["Kakak mengambil jam mainan dari rak buku", "Reni memperhatikan dua jarum jam"]);
    const b = createPage("3-satu-atas-dua-bawah", ["Reno menunjuk angka 8", "Reni berpikir sambil memegang dagu", "Mereka tos di halaman"]);
    return [a, b];
  });
  const [berkas, setBerkas] = useState<File[] | null>(null);
  const [log, setLog] = useState<string[]>([]);
  useEffect(() => {
    void Promise.all(NAMA.map((n, i) => buatBerkas(n, WARNA[i]))).then(setBerkas);
  }, []);

  return (
    <div className="p-6 text-sm">
      <h1 className="font-semibold">Dev: dialog pasang banyak gambar</h1>
      <pre className="mt-3 text-xs">{log.join("\n")}</pre>
      {berkas && (
        <DialogImporGambar
          pages={pages}
          berkas={berkas}
          onUnggah={async (panelId, file) => {
            await new Promise((r) => setTimeout(r, 400));
            setLog((l) => [...l, `${file.name} -> ${panelId.slice(0, 8)}`]);
            return null;
          }}
          onTutup={() => setBerkas(null)}
        />
      )}
    </div>
  );
}
