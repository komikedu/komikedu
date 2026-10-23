import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { createScript } from "../src/lib/ai/pipeline";
import { generatePageImage } from "../src/lib/comics/generate-page";
import { TOKOH_PRESET, fromPreset } from "../src/lib/comics/tokoh";
import { scriptToPages } from "../src/lib/editor/from-script";
import { toRows } from "../src/lib/editor/persist";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const check = (n: string, ok: boolean, info = "") => {
  console.log(`${ok ? "OK  " : "GAGAL"} ${n}${info ? ` (${info})` : ""}`);
  if (!ok) process.exitCode = 1;
};

async function main() {
  const tokoh = ["sari", "doni"].map((id) => fromPreset(TOKOH_PRESET.find((t) => t.id === id)!));
  const { script } = await createScript({
    topik: "Bangun datar",
    jenjang: 4,
    mapel: "Matematika",
    jumlahHalaman: 4,
    tokoh: tokoh.map((t) => ({ nama: t.nama, peran: t.peran, deskripsi: t.deskripsi })),
  });
  const teks = JSON.stringify(script);
  check("naskah memakai Sari", teks.includes("Sari"));
  check("naskah memakai Doni", teks.includes("Doni"));

  const { data: u } = await admin.from("users").select("id, saldo_kredit").limit(1).single();
  const userId = u!.id as string;
  const { data: c } = await admin
    .from("comics")
    .insert({ user_id: userId, judul: "[UJI TOKOH] hapus otomatis", gaya: "kartun-cerah", jenjang: 4, naskah_status: "approved", tokoh_json: tokoh })
    .select("id")
    .single();
  const comicId = c!.id as string;
  let terpakai = 0;
  try {
    const { pages, panelScripts } = scriptToPages(script);
    const rows = toRows(comicId, pages);
    await admin.from("pages").insert(rows.pages);
    await admin.from("panels").insert(rows.panels.map((p) => ({ ...p, script_json: panelScripts.get(p.id) })));

    const r = await generatePageImage(admin, admin, userId, comicId, pages[0].id, "http://localhost:3001");
    if (r.ok) terpakai++;
    check("halaman 1 dibuat dengan potret tokoh sebagai referensi", r.ok, r.ok ? `${r.panels.length} panel` : r.error);
    const { data: cm } = await admin.from("comics").select("karakter_json, ref_halaman_url").eq("id", comicId).single();
    const sheet = (cm?.karakter_json ?? []) as { nama: string; deskripsi: string }[];
    check("lembar karakter memakai deskripsi tokoh pilihan apa adanya", sheet.find((k) => k.nama === "Sari")?.deskripsi === tokoh[0].deskripsi);
    if (cm?.ref_halaman_url) {
      await mkdir("tmp/tokoh", { recursive: true });
      await writeFile("tmp/tokoh/halaman-1.webp", new Uint8Array(await (await fetch(cm.ref_halaman_url)).arrayBuffer()));
    }
    console.log("halaman 1:", script.halaman[0].panel.map((p) => `[${p.urutan}] ${p.adegan.slice(0, 60)}`).join(" | "));
  } finally {
    if (terpakai) await admin.rpc("refund_credits", { p_user: userId, p_amount: terpakai, p_alasan: "refund uji otomatis", p_ref: comicId });
    const { data: files } = await admin.storage.from("panels").list(`${userId}/${comicId}`);
    if (files?.length) await admin.storage.from("panels").remove(files.map((f) => `${userId}/${comicId}/${f.name}`));
    await admin.from("comics").delete().eq("id", comicId);
    const { data: s } = await admin.from("users").select("saldo_kredit").eq("id", userId).single();
    console.log(`bersih-bersih selesai, saldo ${s?.saldo_kredit} (awal ${u!.saldo_kredit})`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
