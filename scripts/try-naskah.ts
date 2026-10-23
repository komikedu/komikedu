import { createClient } from "@supabase/supabase-js";
import { checkScript } from "../src/lib/ai/check";
import { createScript } from "../src/lib/ai/pipeline";
import { terimaPerbaikan } from "../src/lib/comics/naskah";
import { NaskahEditSchema } from "../src/lib/comics/naskah-edit";
import { scriptToPages } from "../src/lib/editor/from-script";
import { fromNested, toRows, type NestedPage } from "../src/lib/editor/persist";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

function check(name: string, ok: boolean, info = "") {
  console.log(`${ok ? "OK  " : "GAGAL"} ${name}${info ? ` (${info})` : ""}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  const { data: u } = await admin.from("users").select("id").limit(1).single();
  const { data: comic } = await admin
    .from("comics")
    .insert({ user_id: u!.id, judul: "[UJI NASKAH] hapus otomatis", topik: "KPK dan FPB", jenjang: 5, jumlah_halaman: 4, gaya: "kartun-cerah" })
    .select("id")
    .single();
  const comicId = comic!.id as string;
  try {
    const t0 = Date.now();
    const { outline, script, flags } = await createScript({ topik: "KPK dan FPB", jenjang: 5, mapel: "Matematika", jumlahHalaman: 4 });
    check("naskah dibuat Gemini", true, `${((Date.now() - t0) / 1000).toFixed(1)} dtk, judul "${outline.judul}"`);
    check("naskah lolos batas suntingan", NaskahEditSchema.safeParse(script).success);
    check("4 halaman", script.halaman.length === 4, `${script.halaman.length}`);
    const counts = script.halaman.map((h) => h.panel.length);
    check("tiap halaman 2-4 panel", counts.every((n) => n >= 2 && n <= 4), counts.join(","));
    console.log(`     tanda awal: ${flags.length}`, flags.map((f) => `${f.jenis} h${f.halaman}p${f.panel}: ${f.alasan}`));

    let final = script;
    for (const f of flags.filter((x) => x.jenis === "hitungan" && x.seharusnya !== undefined)) {
      final = terimaPerbaikan(final, f.halaman, f.panel, f.hitungan!, f.seharusnya!).script;
    }
    const sisa = checkScript(final).filter((f) => f.jenis === "hitungan");
    check("tanda hitungan beres setelah terima perbaikan", sisa.length === 0, `${sisa.length} sisa`);

    const up = await admin.from("comics").update({ outline_json: outline, naskah_json: final, naskah_flags: checkScript(final), naskah_status: "review" }).eq("id", comicId);
    check("naskah tersimpan di comics", !up.error, up.error?.message ?? "");

    const { pages, panelScripts } = scriptToPages(final);
    const rows = toRows(comicId, pages);
    const e1 = (await admin.from("pages").insert(rows.pages)).error;
    const e2 = (await admin.from("panels").insert(rows.panels.map((p) => ({ ...p, script_json: panelScripts.get(p.id) })))).error;
    const e3 = rows.bubbles.length ? (await admin.from("bubbles").insert(rows.bubbles)).error : null;
    check("halaman, panel, balon masuk database", !e1 && !e2 && !e3, [e1, e2, e3].filter(Boolean).map((e) => e!.message).join("; "));

    const { data } = await admin
      .from("pages")
      .select("id, urutan, template_layout, panels(id, urutan, script_json, image_url, posisi, tampil, adegan, math_elements_json, bubbles(id, jenis, teks, posisi, ukuran, ekor, font_size, tampil, urutan))")
      .eq("comic_id", comicId)
      .order("urutan");
    const back = fromNested(data as unknown as NestedPage[]);
    const dialogCount = final.halaman.reduce((n, h) => n + h.panel.reduce((m, p) => m + p.dialog.length, 0), 0);
    check("dimuat ulang: jumlah halaman sama", back.length === final.halaman.length);
    check("dimuat ulang: jumlah balon = jumlah dialog", back.reduce((n, p) => n + p.bubbles.length, 0) === dialogCount, `${dialogCount}`);
    check("dimuat ulang: adegan panel terisi", back.every((p) => p.panels.every((x) => x.adegan.length > 0)));
    const inside = back.every((pg) => pg.bubbles.every((b) => {
      const p = pg.panels.find((x) => x.id === b.panelId)!;
      return b.x >= p.x && b.y >= p.y && b.x + b.w <= p.x + p.w && b.y + b.h <= p.y + p.h;
    }));
    check("semua balon di dalam panelnya", inside);
    console.log("     contoh halaman 1:");
    for (const p of final.halaman[0].panel) console.log(`       [${p.urutan}] ${p.adegan.slice(0, 70)}... | ${p.dialog.map((d) => `${d.karakter}: ${d.teks}`).join(" / ").slice(0, 110)}`);
  } finally {
    await admin.from("comics").delete().eq("id", comicId);
    const { count } = await admin.from("comics").select("id", { count: "exact", head: true }).eq("id", comicId);
    console.log(count === 0 ? "komik uji dihapus" : "PERINGATAN: komik uji masih ada");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
