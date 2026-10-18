import { checkScript } from "./check";
import { MODEL_FLASH, generateJson } from "./gemini";
import {
  MAX_BALLOON_WORDS,
  OutlineSchema,
  ScriptSchema,
  type ComicInput,
  type Flag,
  type Outline,
  type Script,
} from "./schemas";

function konteks(input: ComicInput) {
  return [
    `Mapel: ${input.mapel}, SD kelas ${input.jenjang}.`,
    `Topik: ${input.topik}.`,
    input.tujuan ? `Tujuan pembelajaran: ${input.tujuan}.` : "",
    input.materi ? `Materi sumber (satu-satunya rujukan fakta):\n${input.materi}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function generateOutline(input: ComicInput): Promise<Outline> {
  return generateJson(
    OutlineSchema,
    `Kamu penulis komik edukasi untuk anak SD di Indonesia. Susun outline komik ${input.jumlahHalaman} halaman. ` +
      `Gunakan Bahasa Indonesia sesuai jenjang. Satu halaman membahas satu bagian konsep dengan alur cerita yang runtut.\n\n${konteks(input)}`,
  );
}

export function generateScript(input: ComicInput, outline: Outline): Promise<Script> {
  return generateJson(
    ScriptSchema,
    `Tulis naskah komik per halaman dan panel berdasarkan outline berikut. Aturan:\n` +
      `- Setiap balon dialog maksimal ${MAX_BALLOON_WORDS} kata, bahasa sesuai kelas ${input.jenjang} SD.\n` +
      `- Deskripsi adegan hanya visual; jangan menyuruh menggambar teks atau angka.\n` +
      `- Setiap hitungan yang disebut di dialog atau narasi wajib dicantumkan di "hitungan" ` +
      `dengan ekspresi mathjs dan hasil yang tertulis. Jangan menghitung sendiri; tulis apa adanya.\n` +
      `- Jangan menambah fakta di luar materi sumber.\n\n${konteks(input)}\n\nOutline:\n${JSON.stringify(outline)}`,
    MODEL_FLASH,
  );
}

/** Outline → naskah → cek deterministik. Pengguna wajib meninjau flag sebelum lanjut. */
export async function createScript(
  input: ComicInput,
): Promise<{ outline: Outline; script: Script; flags: Flag[] }> {
  const outline = await generateOutline(input);
  const script = await generateScript(input, outline);
  return { outline, script, flags: checkScript(script) };
}
