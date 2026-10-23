"use client";

import { useState } from "react";

const CONTOH = ["/tokoh/bima-chibi-petualangan.webp", "/tokoh/bima-buku-cerita.webp", "/gaya/kartun-sitkom.webp"];

type Hasil = { src: string; url: string; ms: number; perangkat: string };

export function UjiHapusLatar() {
  const [log, setLog] = useState<string[]>([]);
  const [hasil, setHasil] = useState<Hasil[]>([]);
  const [jalan, setJalan] = useState(false);
  const catat = (s: string) => setLog((l) => [...l, s]);

  async function mulai(perangkat: "webgpu" | "wasm", sisi = 1024, modnet = false) {
    setJalan(true);
    setLog([]);
    setHasil([]);
    try {
      const { AutoModel, AutoProcessor, RawImage, env } = await import("@huggingface/transformers");
      env.allowLocalModels = false;
      const id = modnet ? "Xenova/modnet" : "onnx-community/BiRefNet_lite-ONNX";
      const t0 = performance.now();
      catat(`memuat model (${id}, ${perangkat})...`);
      const model = await AutoModel.from_pretrained(id, { dtype: modnet ? "fp32" : "fp16", device: perangkat });
      const processor = await AutoProcessor.from_pretrained(id);
      catat(`model siap ${Math.round(performance.now() - t0)} ms`);
      for (const src of CONTOH) {
        const t1 = performance.now();
        const image = await RawImage.fromURL(src);
        const { pixel_values } = await processor(image);
        const keluar = modnet ? (await model({ input: pixel_values })).output : (await model({ input_image: pixel_values })).output_image.sigmoid();
        const mask = await RawImage.fromTensor(keluar[0].mul(255).to("uint8")).resize(image.width, image.height);
        const c = document.createElement("canvas");
        c.width = image.width;
        c.height = image.height;
        const ctx = c.getContext("2d")!;
        const rgba = image.rgba();
        const data = new ImageData(new Uint8ClampedArray(rgba.data), image.width, image.height);
        for (let i = 0; i < mask.data.length; i++) data.data[i * 4 + 3] = mask.data[i];
        ctx.putImageData(data, 0, 0);
        const ms = Math.round(performance.now() - t1);
        setHasil((h) => [...h, { src, url: c.toDataURL("image/png"), ms, perangkat }]);
        catat(`${src}: ${ms} ms`);
      }
    } catch (e) {
      catat(`GAGAL: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setJalan(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">Uji hapus latar (BiRefNet lite)</h1>
      <div className="mt-3 flex gap-2">
        <button disabled={jalan} onClick={() => mulai("webgpu")} className="rounded border px-3 py-1.5 text-sm">WebGPU</button>
        <button disabled={jalan} onClick={() => mulai("wasm")} className="rounded border px-3 py-1.5 text-sm">WASM</button>
        <button disabled={jalan} onClick={() => mulai("wasm", 512, true)} className="rounded border px-3 py-1.5 text-sm">MODNet WASM</button>
        <button disabled={jalan} onClick={() => mulai("webgpu", 512, true)} className="rounded border px-3 py-1.5 text-sm">MODNet WebGPU</button>
      </div>
      <pre className="mt-3 text-xs">{log.join("\n")}</pre>
      <div className="mt-4 grid grid-cols-3 gap-4" style={{ background: "repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0/20px 20px" }}>
        {hasil.map((h) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={h.src} src={h.url} alt="hasil" className="w-full" />
        ))}
      </div>
    </div>
  );
}
