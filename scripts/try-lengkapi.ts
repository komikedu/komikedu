import { lengkapiPanelKosong } from "../src/lib/ai/lengkapi";

async function main() {
  const ids = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222", "33333333-3333-4333-8333-333333333333", "44444444-4444-4444-8444-444444444444"];
  const t0 = Date.now();
  const hasil = await lengkapiPanelKosong({
    topik: "Bangun datar",
    jenjang: 5,
    mapel: "Matematika",
    cerita: null,
    materi: null,
    tetangga: [],
    panels: [
      { id: ids[0], adegan: "Doni dan Sari berjalan memasuki taman bermain yang cerah dan penuh warna dengan wajah ceria.", dialog: [{ jenis: "narasi", teks: "Doni dan Sari tiba di taman bermain sekolah." }, { jenis: "bicara", teks: "Sari, lihat papan seluncuran itu!" }] },
      { id: ids[1], adegan: "", dialog: [] },
      { id: ids[2], adegan: "Sari mendekati bagian samping papan seluncuran dan menunjuk permukaan sampingnya.", dialog: [{ jenis: "bicara", teks: "Permukaan samping seluncuran ini berbentuk segitiga, Doni!" }] },
      { id: ids[3], adegan: "Doni memperhatikan permukaan segitiga tersebut sambil mengangguk pelan.", dialog: [{ jenis: "bicara", teks: "Segitiga ini punya tiga sisi dan tiga sudut." }] },
    ],
  });
  console.log(`waktu: ${((Date.now() - t0) / 1000).toFixed(1)} dtk`);
  console.log("panel diisi:", hasil.panels.length, "| id benar (panel 2):", hasil.panels.every((p) => p.id === ids[1]));
  for (const p of hasil.panels) {
    console.log("adegan:", p.adegan);
    for (const d of p.dialog) console.log(`  ${d.karakter} (${d.jenis}): ${d.teks}`);
  }
  console.log("peringatan:", hasil.peringatan.length ? hasil.peringatan : "tidak ada");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
