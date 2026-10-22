import { isDeepStrictEqual } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { createBubble, createPage } from "../src/lib/editor/factory";
import { saveEditorData } from "../src/lib/editor/save";
import { fromNested, type NestedPage } from "../src/lib/editor/persist";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

async function load(comicId: string) {
  const { data, error } = await admin
    .from("pages")
    .select("id, urutan, template_layout, panels(id, urutan, script_json, image_url, posisi, tampil, bubbles(id, jenis, teks, posisi, ukuran, ekor, font_size, tampil, urutan))")
    .eq("comic_id", comicId)
    .order("urutan");
  if (error) throw error;
  return fromNested(data as unknown as NestedPage[]);
}

function check(name: string, ok: boolean) {
  console.log(`${ok ? "OK  " : "GAGAL"} ${name}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  const { data: u } = await admin.from("users").select("id").limit(1).single();
  const userId = u!.id as string;
  const { data: comic } = await admin.from("comics").insert({ user_id: userId, judul: "[UJI SIMPAN] hapus otomatis" }).select("id").single();
  const comicId = comic!.id as string;
  try {
    // 1. simpan 2 halaman dengan balon
    const p1 = createPage("3-satu-atas-dua-bawah");
    p1.bubbles = [createBubble(p1.panels[0].id, "bicara", 200, 100, "Halo"), createBubble(p1.panels[1].id, "narasi", 300, 800, "Narasi")];
    const p2 = createPage("4-grid");
    let r = await saveEditorData(admin, userId, comicId, [p1, p2]);
    check("simpan awal", r.ok);
    let back = await load(comicId);
    check("2 halaman tersimpan", back.length === 2);
    check("balon kembali utuh", isDeepStrictEqual(back[0].bubbles, p1.bubbles));
    check("panel kembali utuh (posisi, tampil)", isDeepStrictEqual(back[0].panels, p1.panels));

    // 2. ubah teks, hapus 1 balon, hapus halaman 2, tambah halaman baru
    p1.bubbles[0].text = "Halo dunia";
    p1.bubbles = [p1.bubbles[0]];
    const p3 = createPage("1-penuh");
    r = await saveEditorData(admin, userId, comicId, [p1, p3]);
    check("simpan kedua (ubah, hapus, tambah)", r.ok);
    back = await load(comicId);
    check("halaman 2 lama terhapus, halaman baru masuk", back.length === 2 && back[1].id === p3.id && !back.some((p) => p.id === p2.id));
    check("balon yang dihapus hilang, teks berubah", back[0].bubbles.length === 1 && back[0].bubbles[0].text === "Halo dunia");

    // 3. hapus semua balon
    p1.bubbles = [];
    r = await saveEditorData(admin, userId, comicId, [p1, p3]);
    back = await load(comicId);
    check("semua balon bisa dihapus", r.ok && back[0].bubbles.length === 0);

    // 4. idempoten: simpan ulang yang sama
    r = await saveEditorData(admin, userId, comicId, [p1, p3]);
    check("simpan ulang idempoten", r.ok && (await load(comicId)).length === 2);

    // 5. penolakan
    check("payload kosong ditolak", !(await saveEditorData(admin, userId, comicId, [])).ok);
    const other = "00000000-0000-4000-8000-000000000001";
    check("user lain ditolak (komik bukan miliknya)", !(await saveEditorData(admin, other, comicId, [p1])).ok);
    check("data tidak berubah setelah penolakan", (await load(comicId)).length === 2);
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
