import { Comic_Neue } from "next/font/google";
import { notFound } from "next/navigation";
import { samplePages } from "@/lib/editor/sample";
import { EditorShell } from "@/app/comics/[id]/editor/editor-shell";
import { fromPreset, TOKOH_PRESET } from "@/lib/comics/tokoh";

const comicFont = Comic_Neue({ weight: ["400", "700"], subsets: ["latin"], display: "swap" });

/** Pratinjau editor dengan data contoh, tanpa login. Hanya ada saat development. */
export default function DevEditorPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className={comicFont.className}>
      <EditorShell title="Pratinjau editor" fontFamily={comicFont.style.fontFamily} initialPages={samplePages()} kredit={15} tokoh={[fromPreset(TOKOH_PRESET[0]), fromPreset(TOKOH_PRESET[1])]} gaya="kartun-cerah"
        karakter={[{ nama: "Siti", deskripsi: "anak perempuan 8 tahun, rambut hitam dikuncir kuda berpita merah, seragam SD putih-merah" }]}
      />
    </div>
  );
}
