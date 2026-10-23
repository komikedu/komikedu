/**
 * Hapus latar gambar di peramban dengan MODNet (matting potret, Apache-2.0, sekitar 26 MB, diunduh sekali lalu
 * disimpan peramban). Berjalan di WASM, tanpa server dan tanpa kredit. Paling cocok untuk satu tokoh; adegan ramai
 * dengan banyak benda bisa ikut terpotong.
 */
const MODEL = "Xenova/modnet";

type Pemuat = Promise<{
  model: (masukan: unknown) => Promise<{ output: { 0: { mul: (n: number) => { to: (t: string) => unknown } } } }>;
  processor: (gambar: unknown) => Promise<{ pixel_values: unknown }>;
  lib: typeof import("@huggingface/transformers");
}>;

let pemuat: Pemuat | null = null;

function muat(): Pemuat {
  pemuat ??= (async () => {
    const lib = await import("@huggingface/transformers");
    lib.env.allowLocalModels = false;
    const [model, processor] = await Promise.all([
      lib.AutoModel.from_pretrained(MODEL, { dtype: "fp32", device: "wasm" }),
      lib.AutoProcessor.from_pretrained(MODEL),
    ]);
    return { model, processor, lib } as unknown as Awaited<Pemuat>;
  })().catch((e) => {
    pemuat = null; // gagal unduh: coba lagi pada klik berikutnya
    throw e;
  });
  return pemuat;
}

/** Mulai mengunduh model lebih awal (mis. saat tombol disorot) agar klik berikutnya terasa cepat. */
export const siapkanHapusLatar = () => void muat().catch(() => undefined);

/** Gambar dengan latar transparan sebagai PNG. */
export async function hapusLatar(url: string): Promise<File> {
  const { model, processor, lib } = await muat();
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error("Gambar tidak bisa dibaca");
  const image = await lib.RawImage.fromBlob(await res.blob());
  const { pixel_values } = await processor(image);
  const { output } = await model({ input: pixel_values });
  const mask = await lib.RawImage.fromTensor(output[0].mul(255).to("uint8") as never).resize(image.width, image.height);

  const kanvas = document.createElement("canvas");
  kanvas.width = image.width;
  kanvas.height = image.height;
  const ctx = kanvas.getContext("2d");
  if (!ctx) throw new Error("Kanvas tidak tersedia");
  const data = new ImageData(new Uint8ClampedArray(image.rgba().data), image.width, image.height);
  for (let i = 0; i < mask.data.length; i++) data.data[i * 4 + 3] = mask.data[i];
  ctx.putImageData(data, 0, 0);
  const blob = await new Promise<Blob | null>((ok) => kanvas.toBlob(ok, "image/png"));
  if (!blob) throw new Error("Gagal membuat gambar");
  return new File([blob], "tanpa-latar.png", { type: "image/png" });
}
