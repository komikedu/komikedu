import { createScript } from "../src/lib/ai/pipeline";

async function main() {
  const { outline, script, flags } = await createScript({
    topik: "KPK dan FPB",
    jenjang: 5,
    mapel: "Matematika",
    tujuan: "Siswa dapat menentukan KPK dan FPB dari dua bilangan",
    jumlahHalaman: 4,
  });

  console.log("JUDUL:", outline.judul);
  for (const h of script.halaman) {
    console.log(`\n== Halaman ${h.urutan} ==`);
    for (const p of h.panel) {
      console.log(`  [Panel ${p.urutan}] ${p.adegan}`);
      for (const d of p.dialog) console.log(`    ${d.karakter} (${d.jenis}): ${d.teks}`);
      for (const c of p.hitungan) console.log(`    = ${c.ekspresi} -> ${c.hasilTertulis}`);
    }
  }
  console.log("\nFLAGS:", flags.length ? flags : "tidak ada");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
