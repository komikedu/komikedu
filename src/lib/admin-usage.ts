export type BarisGeneration = {
  provider: string | null;
  model: string | null;
  jenis: string;
  status: string;
  biaya: number | string | null;
  created_at: string;
};

export type RingkasanModel = { provider: string; model: string; panggilan: number; gagal: number; biaya: number };
export type RingkasanHari = { tanggal: string; panggilan: number; biaya: number };

/** Tanggal kalender WIB (UTC+7) dari timestamp, format YYYY-MM-DD. */
export const tanggalWib = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 10);

/** Rangkum baris generations: total per provider+model, dan per hari untuk `hari` hari terakhir (termasuk hari tanpa panggilan). */
export function ringkasPemakaian(rows: BarisGeneration[], now: Date, hari = 7): { perModel: RingkasanModel[]; perHari: RingkasanHari[]; total: number } {
  const perModel = new Map<string, RingkasanModel>();
  const perHari = new Map<string, RingkasanHari>();
  for (let i = hari - 1; i >= 0; i--) {
    const t = tanggalWib(new Date(now.getTime() - i * 86400_000).toISOString());
    perHari.set(t, { tanggal: t, panggilan: 0, biaya: 0 });
  }
  let total = 0;
  for (const r of rows) {
    const biaya = Number(r.biaya ?? 0) || 0;
    total += biaya;
    const provider = r.provider ?? "-";
    const model = r.model ?? "(tidak tercatat)";
    const k = `${provider}|${model}`;
    const m = perModel.get(k) ?? { provider, model, panggilan: 0, gagal: 0, biaya: 0 };
    m.panggilan++;
    if (r.status === "gagal") m.gagal++;
    m.biaya += biaya;
    perModel.set(k, m);
    const h = perHari.get(tanggalWib(r.created_at));
    if (h) {
      h.panggilan++;
      h.biaya += biaya;
    }
  }
  return { perModel: [...perModel.values()].sort((a, b) => b.biaya - a.biaya || b.panggilan - a.panggilan), perHari: [...perHari.values()], total };
}
