import { AsyncLocalStorage } from "node:async_hooks";

/** Tarif berbayar standar Gemini API (USD per 1 juta token), dicek 23 Okt 2026 di ai.google.dev/gemini-api/docs/pricing. */
const TARIF: Record<string, { input: number; output: number; outputGambar?: number }> = {
  "gemini-3.5-flash-lite": { input: 0.3, output: 2.5 },
  // tidak tercantum di halaman harga Google; angka dari kalkulator pihak ketiga
  "gemini-3.5-flash": { input: 1.5, output: 9 },
  "gemini-nano-banana-2.1": { input: 1.5, output: 7.5, outputGambar: 30 },
  "gemini-3.1-flash-image": { input: 0.5, output: 3, outputGambar: 60 },
  "gemini-3-pro-image": { input: 2, output: 12, outputGambar: 120 },
};

/** Bentuk minimal `usageMetadata` dari respons @google/genai. */
export type UsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  candidatesTokensDetails?: { modality?: string; tokenCount?: number }[];
};

export type Pemakaian = { model: string; input_tokens: number; output_tokens: number; biaya: number | null };

/** Hitung token dan perkiraan biaya satu panggilan. Token berpikir ditagih sebagai output teks. */
export function hitungPemakaian(model: string, meta: UsageMetadata | undefined): Pemakaian {
  const input = meta?.promptTokenCount ?? 0;
  const output = (meta?.candidatesTokenCount ?? 0) + (meta?.thoughtsTokenCount ?? 0);
  const gambar = (meta?.candidatesTokensDetails ?? []).filter((d) => d.modality === "IMAGE").reduce((s, d) => s + (d.tokenCount ?? 0), 0);
  const t = TARIF[model];
  const biaya = t
    ? (input * t.input + (output - gambar) * t.output + gambar * (t.outputGambar ?? t.output)) / 1_000_000
    : null;
  return { model, input_tokens: input, output_tokens: output, biaya: biaya === null ? null : Number(biaya.toFixed(6)) };
}

const pencatat = new AsyncLocalStorage<Pemakaian[]>();

/** Dipanggil wrapper Gemini setiap kali ada respons; masuk ke `log` dari `rekamPemakaian` yang sedang berjalan. */
export function catatPemakaian(model: string, meta: UsageMetadata | undefined): Pemakaian {
  const p = hitungPemakaian(model, meta);
  pencatat.getStore()?.push(p);
  return p;
}

/** Jalankan `fn` sambil mengumpulkan pemakaian setiap panggilan AI di dalamnya ke `log` (tetap terisi bila `fn` gagal). */
export function rekamPemakaian<R>(log: Pemakaian[], fn: () => Promise<R>): Promise<R> {
  return pencatat.run(log, fn);
}

/** Baris tabel generations: satu per panggilan AI, atau satu baris tanpa token bila tidak ada respons sama sekali. */
export function barisGenerations<T extends object>(log: Pemakaian[], dasar: T): (T & Partial<Pemakaian>)[] {
  return log.length ? log.map((p) => ({ ...dasar, ...p })) : [dasar];
}
