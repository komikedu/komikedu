"use server";

import { z } from "zod";
import { uuid } from "@/lib/comics/naskah-edit";
import { GantiNamaSchema, gantiNamaDiScript, MAX_TOKOH, TokohSchema, type Tokoh } from "@/lib/comics/tokoh";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const InputSchema = z.object({
  tokoh: z.array(TokohSchema).max(MAX_TOKOH),
  ganti: z.array(GantiNamaSchema).max(MAX_TOKOH),
});

type ScriptPanel = Parameters<typeof gantiNamaDiScript>[0];
type Naskah = { halaman?: { panel?: ScriptPanel[] }[] };

/**
 * Simpan tokoh komik dari editor. Bila tokoh diganti (`ganti`), nama lama di naskah tersimpan
 * (script_json panel dan naskah_json) ikut diganti agar gambar berikutnya memakai tokoh baru.
 * Balon dan adegan di editor diganti di klien lalu tersimpan lewat autosave.
 */
export async function simpanTokoh(comicId: string, input: { tokoh: Tokoh[]; ganti: { lama: string; baru: string }[] }): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!uuid.safeParse(comicId).success) return { ok: false, error: "Komik tidak ditemukan" };
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Data tokoh tidak valid" };
  const { tokoh, ganti } = parsed.data;
  const nama = tokoh.map((t) => t.nama.toLowerCase());
  if (new Set(nama).size !== nama.length) return { ok: false, error: "Nama tokoh tidak boleh sama" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesi berakhir, silakan login lagi" };
  const { data: comic } = await supabase.from("comics").select("id, user_id, naskah_json").eq("id", comicId).maybeSingle();
  if (!comic || comic.user_id !== user.id) return { ok: false, error: "Komik tidak ditemukan" };

  const { error } = await supabase.from("comics").update({ tokoh_json: tokoh }).eq("id", comicId);
  if (error) return { ok: false, error: "Gagal menyimpan tokoh" };
  if (!ganti.length) return { ok: true };

  // script_json dan naskah_json hanya boleh ditulis server (service role)
  const admin = createAdminClient();
  const { data: pages } = await supabase.from("pages").select("panels(id, script_json)").eq("comic_id", comicId);
  const panels = (pages ?? []).flatMap((p) => (p.panels ?? []) as { id: string; script_json: ScriptPanel | null }[]);
  for (const p of panels) {
    if (!p.script_json) continue;
    const baru = gantiNamaDiScript(p.script_json, ganti);
    if (JSON.stringify(baru) === JSON.stringify(p.script_json)) continue;
    const { error: e } = await admin.from("panels").update({ script_json: baru }).eq("id", p.id);
    if (e) return { ok: false, error: "Tokoh tersimpan, tapi gagal memperbarui naskah" };
  }
  const naskah = comic.naskah_json as Naskah | null;
  if (naskah?.halaman) {
    const baru = { ...naskah, halaman: naskah.halaman.map((h) => ({ ...h, panel: h.panel?.map((sp) => gantiNamaDiScript(sp, ganti)) })) };
    await admin.from("comics").update({ naskah_json: baru }).eq("id", comicId);
  }
  return { ok: true };
}
