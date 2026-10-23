import { notFound, redirect } from "next/navigation";
import { AppHeaderView } from "@/components/app-header";
import { isAdminEmail } from "@/lib/admin";
import { daftarPengguna } from "@/lib/admin-kredit";
import { daftarLaporan } from "@/lib/comics/komunitas";
import { ALASAN_LAPORAN } from "@/lib/comics/komunitas-schema";
import { ringkasPemakaian, type BarisGeneration } from "@/lib/admin-usage";
import { getImageProviderName, type ImageProviderName } from "@/lib/settings";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { simpanProvider, tarikKomikDilaporkan, tutupLaporanKomik } from "./actions";
import { PanelKredit } from "./panel-kredit";

export const dynamic = "force-dynamic";

const KURS_IDR = 16_500; // perkiraan kasar, hanya untuk tampilan

const PILIHAN: { id: ImageProviderName; judul: string; isi: string; siap: () => boolean }[] = [
  {
    id: "cloudflare",
    judul: "Cloudflare FLUX.2 klein 4B",
    isi: "Gratis 10.000 neuron/hari (±80 panel). Panel dibuat satu per satu. Bila kuota habis, generate gagal dan kredit guru dikembalikan.",
    siap: () => !!process.env.CLOUDFLARE_ACCOUNT_ID && !!process.env.CLOUDFLARE_API_TOKEN,
  },
  {
    id: "gemini",
    judul: "Gemini Nano Banana 2.1",
    isi: "Berbayar, ±Rp840 per halaman. Satu gambar untuk semua panel lalu dipotong.",
    siap: () => !!process.env.GEMINI_API_KEY,
  },
];

const usd = (n: number) => `$${n.toFixed(n < 1 ? 4 : 2)}`;
const idr = (n: number) => `Rp${Math.round(n * KURS_IDR).toLocaleString("id-ID")}`;

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  if (!isAdminEmail(user.email)) notFound();

  const sejak = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [{ data: profil }, aktif, { data: rows }, pengguna, laporan] = await Promise.all([
    supabase.from("users").select("nama, saldo_kredit").eq("id", user.id).single(),
    getImageProviderName(),
    createAdminClient()
      .from("generations")
      .select("provider, model, jenis, status, biaya, created_at")
      .gte("created_at", sejak)
      .order("created_at", { ascending: false })
      .limit(5000),
    daftarPengguna(createAdminClient()).catch((e) => {
      console.error("daftar pengguna gagal", e);
      return [];
    }),
    daftarLaporan(createAdminClient()).catch((e) => {
      console.error("daftar laporan gagal", e);
      return [];
    }),
  ]);
  const { perModel, perHari, total } = ringkasPemakaian((rows ?? []) as BarisGeneration[], new Date());
  const maksHari = Math.max(1, ...perHari.map((h) => h.panggilan));

  return (
    <div className="min-h-screen bg-surface-muted">
      <AppHeaderView user={{ email: user.email ?? "", nama: profil?.nama ?? "", saldo: profil?.saldo_kredit ?? 0, admin: true }} />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold">Admin</h1>

        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="font-semibold">Provider gambar</h2>
          <p className="mt-1 text-sm text-gray-600">Dipakai untuk gambar halaman, edit panel, dan potret tokoh. Perubahan berlaku dalam 30 detik, tanpa restart.</p>
          <form action={simpanProvider} className="mt-4 space-y-3">
            {PILIHAN.map((p) => {
              const siap = p.siap();
              return (
                <label key={p.id} className="flex cursor-pointer gap-3 rounded-lg border border-line p-3 has-[:checked]:border-brand has-[:checked]:bg-brand/5">
                  <input type="radio" name="provider" value={p.id} defaultChecked={aktif === p.id} className="mt-1 accent-[var(--color-brand)]" />
                  <span>
                    <span className="flex flex-wrap items-center gap-2 font-medium">
                      {p.judul}
                      {aktif === p.id && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">aktif</span>}
                      {!siap && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">kunci API belum diatur</span>}
                    </span>
                    <span className="mt-0.5 block text-sm text-gray-600">{p.isi}</span>
                  </span>
                </label>
              );
            })}
            <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground">
              Simpan
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="font-semibold">Kredit pengguna</h2>
          <p className="mt-1 text-sm text-gray-600">Tambahkan kredit ke pengguna. Setiap penambahan tercatat di riwayat kredit beserta email admin yang menambahkannya.</p>
          <PanelKredit pengguna={pengguna} />
        </section>

        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="font-semibold">Laporan komunitas {laporan.length > 0 && <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">{laporan.length} komik</span>}</h2>
          <p className="mt-1 text-sm text-gray-600">Komik terbit yang dilaporkan pembaca. Tarik komik dari komunitas (tetap utuh di akun pemiliknya) atau tutup laporan bila tidak beralasan.</p>
          {laporan.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">Tidak ada laporan baru.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {laporan.map((l) => (
                <li key={l.comicId} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {l.judul} {!l.terbit && <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-600">sudah ditarik</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-600">
                      {l.jumlah} laporan:{" "}
                      {ALASAN_LAPORAN.filter((a) => l.alasan[a.id] > 0)
                        .map((a) => `${a.label} (${l.alasan[a.id]})`)
                        .join(", ")}
                    </p>
                    {l.catatan.map((c, i) => (
                      <p key={i} className="mt-1 line-clamp-2 text-xs italic text-gray-500">
                        “{c}”
                      </p>
                    ))}
                    {l.terbit && (
                      <a href={`/baca/${l.comicId}`} target="_blank" rel="noopener" className="mt-1 inline-block text-xs text-brand underline">
                        Buka komik
                      </a>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {l.terbit && (
                      <form action={tarikKomikDilaporkan}>
                        <input type="hidden" name="comicId" value={l.comicId} />
                        <button type="submit" className="rounded-lg bg-danger px-3 py-1.5 text-xs font-medium text-white">
                          Tarik komik
                        </button>
                      </form>
                    )}
                    <form action={tutupLaporanKomik}>
                      <input type="hidden" name="comicId" value={l.comicId} />
                      <button type="submit" className="rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-surface-muted">
                        Tutup laporan
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="font-semibold">Pemakaian AI 30 hari terakhir</h2>
          <p className="mt-1 text-sm text-gray-600">
            Perkiraan dari tabel generations: {usd(total)} (±{idr(total)}, kurs {KURS_IDR.toLocaleString("id-ID")}). Biaya Cloudflare adalah tarif berbayar; di akun gratis dalam kuota
            nyatanya Rp0. Tagihan pasti tetap di billing Google.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Provider</th>
                  <th className="py-2 pr-3 font-medium">Model</th>
                  <th className="py-2 pr-3 text-right font-medium">Panggilan</th>
                  <th className="py-2 pr-3 text-right font-medium">Gagal</th>
                  <th className="py-2 text-right font-medium">Perkiraan biaya</th>
                </tr>
              </thead>
              <tbody>
                {perModel.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-3 text-gray-500">
                      Belum ada panggilan.
                    </td>
                  </tr>
                )}
                {perModel.map((m) => (
                  <tr key={`${m.provider}|${m.model}`} className="border-t border-line">
                    <td className="py-2 pr-3">{m.provider}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{m.model}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{m.panggilan}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{m.gagal}</td>
                    <td className="py-2 text-right tabular-nums">
                      {usd(m.biaya)} <span className="text-gray-500">({idr(m.biaya)})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-6 text-sm font-medium">7 hari terakhir (WIB)</h3>
          <ul className="mt-2 space-y-1.5">
            {perHari.map((h) => (
              <li key={h.tanggal} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-sm">
                <span className="tabular-nums text-gray-600">{h.tanggal}</span>
                <span className="h-2.5 rounded-full bg-surface-muted">
                  <span className="block h-full rounded-full bg-brand" style={{ width: `${(h.panggilan / maksHari) * 100}%` }} />
                </span>
                <span className="w-28 text-right tabular-nums">
                  {h.panggilan} · {idr(h.biaya)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
