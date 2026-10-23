import { createClient } from "@supabase/supabase-js";
import { createBubble, createPage } from "../src/lib/editor/factory";
import { duplicatePanel, splitPanel } from "../src/lib/editor/panel-ops";
import { fromNested, type NestedPage } from "../src/lib/editor/persist";
import { saveEditorData } from "../src/lib/editor/save";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

async function load(comicId: string) {
  const { data } = await admin
    .from("pages")
    .select("id, urutan, template_layout, panels(id, urutan, script_json, image_url, posisi, tampil, adegan, math_elements_json, bubbles(id, jenis, teks, posisi, ukuran, ekor, font_size, tampil, urutan))")
    .eq("comic_id", comicId)
    .order("urutan");
  return fromNested(data as unknown as NestedPage[]);
}
const check = (n: string, ok: boolean, info = "") => {
  console.log(`${ok ? "OK  " : "GAGAL"} ${n}${info ? ` (${info})` : ""}`);
  if (!ok) process.exitCode = 1;
};

async function main() {
  const { data: u } = await admin.from("users").select("id").limit(1).single();
  const userId = u!.id as string;
  const { data: c } = await admin.from("comics").insert({ user_id: userId, judul: "[UJI SPLIT] hapus otomatis" }).select("id").single();
  const comicId = c!.id as string;
  try {
    const page = createPage("3-satu-atas-dua-bawah");
    page.bubbles = [createBubble(page.panels[0].id, "bicara", 300, 150, "halo")];
    check("simpan awal 3 panel", (await saveEditorData(admin, userId, comicId, [page])).ok);

    // split panel PERTAMA: panel baru disisipkan di urutan 2, panel lain bergeser (2->3, 3->4)
    splitPanel(page, page.panels[0].id, "horizontal");
    const r1 = await saveEditorData(admin, userId, comicId, [page]);
    check("simpan setelah split di tengah urutan", r1.ok, r1.ok ? "" : r1.error);
    let back = await load(comicId);
    check("urutan panel di database sama dengan editor", JSON.stringify(back[0].panels.map((p) => p.id)) === JSON.stringify(page.panels.map((p) => p.id)), `${back[0].panels.length} panel`);

    // duplikat panel pertama lagi (sisip di tengah), lalu simpan
    duplicatePanel(page, page.panels[0].id);
    const r2 = await saveEditorData(admin, userId, comicId, [page]);
    back = await load(comicId);
    check("simpan setelah duplikat di tengah urutan", r2.ok && back[0].panels.length === 5, `${back[0].panels.length} panel`);
    check("balon duplikat ikut tersimpan", back[0].bubbles.length === 2);
  } finally {
    await admin.from("comics").delete().eq("id", comicId);
    console.log("komik uji dihapus");
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
