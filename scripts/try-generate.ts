import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import type { Script } from "../src/lib/ai/schemas";
import { generatePageImage } from "../src/lib/comics/generate-page";
import { scriptToPages } from "../src/lib/editor/from-script";
import { toRows } from "../src/lib/editor/persist";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const check = (n: string, ok: boolean, info = "") => {
  console.log(`${ok ? "OK  " : "GAGAL"} ${n}${info ? ` (${info})` : ""}`);
  if (!ok) process.exitCode = 1;
};

const NASKAH: Script = {
  halaman: [
    {
      urutan: 1,
      panel: [
        { urutan: 1, adegan: "Kiki dan Doni berdiri di depan toko kue yang ramai, lampu hias warna-warni di atas pintu.", karakter: ["Kiki", "Doni"], dialog: [{ karakter: "Kiki", jenis: "bicara", teks: "Lihat lampunya!" }], hitungan: [] },
        { urutan: 2, adegan: "Close-up Kiki berpikir sambil menunjuk lampu merah yang menyala.", karakter: ["Kiki"], dialog: [], hitungan: [] },
        { urutan: 3, adegan: "Close-up Doni tersenyum sambil mengacungkan jempol.", karakter: ["Doni"], dialog: [], hitungan: [] },
      ],
    },
    {
      urutan: 2,
      panel: [
        { urutan: 1, adegan: "Kiki dan Doni duduk di meja kelas menghitung kue di atas piring.", karakter: ["Kiki", "Doni"], dialog: [], hitungan: [] },
        { urutan: 2, adegan: "Bu Rina, guru perempuan berkerudung, tersenyum di depan papan tulis.", karakter: ["Bu Rina"], dialog: [{ karakter: "Bu Rina", jenis: "bicara", teks: "Bagus sekali!" }], hitungan: [] },
      ],
    },
  ],
};

async function main() {
  const { data: u } = await admin.from("users").select("id, saldo_kredit").limit(1).single();
  const userId = u!.id as string;
  const saldoAwal = u!.saldo_kredit as number;
  const { data: c } = await admin
    .from("comics")
    .insert({ user_id: userId, judul: "[UJI GAMBAR] hapus otomatis", gaya: "kartun-cerah", jenjang: 5, naskah_status: "approved" })
    .select("id")
    .single();
  const comicId = c!.id as string;
  let terpakai = 0;
  try {
    const { pages, panelScripts } = scriptToPages(NASKAH);
    const rows = toRows(comicId, pages);
    await admin.from("pages").insert(rows.pages);
    await admin.from("panels").insert(rows.panels.map((p) => ({ ...p, script_json: panelScripts.get(p.id) })));

    const t0 = Date.now();
    const r1 = await generatePageImage(admin, admin, userId, comicId, pages[0].id);
    if (r1.ok) terpakai++;
    check("halaman 1 dibuat", r1.ok, r1.ok ? `${((Date.now() - t0) / 1000).toFixed(1)} dtk, ${r1.panels.length} panel` : r1.error);

    const { data: cm } = await admin.from("comics").select("karakter_json, ref_halaman_url").eq("id", comicId).single();
    check("lembar karakter tersimpan", Array.isArray(cm?.karakter_json) && cm.karakter_json.length >= 2, JSON.stringify(cm?.karakter_json)?.slice(0, 220));
    check("halaman referensi tersimpan", !!cm?.ref_halaman_url);

    if (r1.ok) {
      const { data: pn } = await admin.from("panels").select("id, image_url, status").eq("page_id", pages[0].id);
      check("image_url dan status panel terisi", (pn ?? []).every((p) => p.image_url && p.status === "selesai"));
      await mkdir("tmp/generate", { recursive: true });
      for (const [i, p] of r1.panels.entries()) {
        const res = await fetch(p.imageUrl);
        check(`gambar panel ${i + 1} bisa diunduh publik`, res.ok && (res.headers.get("content-type") ?? "").includes("webp"), `${res.status}`);
        await writeFile(`tmp/generate/h1-panel-${i + 1}.webp`, new Uint8Array(await res.arrayBuffer()));
      }
      if (cm?.ref_halaman_url) await writeFile("tmp/generate/h1-halaman.webp", new Uint8Array(await (await fetch(cm.ref_halaman_url)).arrayBuffer()));
    }

    const t1 = Date.now();
    const r2 = await generatePageImage(admin, admin, userId, comicId, pages[1].id);
    if (r2.ok) terpakai++;
    check("halaman 2 dibuat dengan referensi halaman 1", r2.ok, r2.ok ? `${((Date.now() - t1) / 1000).toFixed(1)} dtk` : r2.error);
    if (r2.ok) {
      for (const [i, p] of r2.panels.entries()) await writeFile(`tmp/generate/h2-panel-${i + 1}.webp`, new Uint8Array(await (await fetch(p.imageUrl)).arrayBuffer()));
    }

    const { data: akhir } = await admin.from("users").select("saldo_kredit").eq("id", userId).single();
    check("kredit terpotong 1 per halaman berhasil", akhir!.saldo_kredit === saldoAwal - terpakai, `${saldoAwal} -> ${akhir!.saldo_kredit}`);

    // generate lagi saat panel sedang "generating" harus ditolak
    await admin.from("panels").update({ status: "generating" }).eq("page_id", pages[0].id);
    const r3 = await generatePageImage(admin, admin, userId, comicId, pages[0].id);
    check("generate ganda ditolak tanpa memotong kredit", !r3.ok && r3.status === 409);
  } finally {
    if (terpakai) await admin.rpc("refund_credits", { p_user: userId, p_amount: terpakai, p_alasan: "refund uji otomatis", p_ref: comicId });
    const { data: files } = await admin.storage.from("panels").list(`${userId}/${comicId}`);
    if (files?.length) await admin.storage.from("panels").remove(files.map((f) => `${userId}/${comicId}/${f.name}`));
    await admin.from("comics").delete().eq("id", comicId);
    const { data: s } = await admin.from("users").select("saldo_kredit").eq("id", userId).single();
    console.log(`bersih-bersih: komik dan berkas uji dihapus, saldo kembali ${s?.saldo_kredit} (awal ${saldoAwal})`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
