import { createScript } from "../src/lib/ai/pipeline";

async function main() {
  const cerita = "Detektif cilik Rara memecahkan misteri buku hilang di perpustakaan sekolah dengan petunjuk tentang KPK dan FPB.";
  const { outline, script, flags } = await createScript({ topik: "KPK dan FPB", jenjang: 5, mapel: "Matematika", jumlahHalaman: 4, cerita });
  const teks = JSON.stringify({ outline, script }).toLowerCase();
  console.log("judul:", outline.judul);
  console.log("menyebut Rara:", teks.includes("rara"));
  console.log("latar perpustakaan:", teks.includes("perpustakaan"));
  console.log("unsur misteri/detektif:", teks.includes("misteri") || teks.includes("detektif"));
  console.log("halaman:", script.halaman.length, "panel:", script.halaman.map((h) => h.panel.length).join(","), "tanda:", flags.length);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
