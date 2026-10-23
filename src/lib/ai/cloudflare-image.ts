import "server-only";
import sharp, { type OverlayOptions } from "sharp";
import type { ImageProvider, PageImageRequest, PageImageResult, PanelEditRequest, PortraitRequest } from "./image-provider";
import { buildEditPrompt, buildPanelPrompt, buildPortraitPrompt } from "./page-prompt";
import { catatBiaya } from "./usage";

export const CF_IMAGE_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";

/** Ukuran kanvas halaman gabungan (3:4); panel ditempel tepat di posisi template agar crop pas. */
const PAGE_PX = { w: 1152, h: 1536 };
const MAX_SISI = 1024;
const MAX_REF = 4; // batas model: input_image_0..3
const REF_MAKS_PX = 511; // semua gambar input harus lebih kecil dari 512x512

// tarif flux-2-klein-4b di developers.cloudflare.com/workers-ai/platform/pricing (dicek 23 Okt 2026)
const NEURON_OUTPUT_PER_TILE = 26.05;
const NEURON_INPUT_PER_TILE = 5.37;
const USD_PER_NEURON = 0.011 / 1000;

const RETRYABLE = new Set([500, 502, 503]);
const MAX_COBA_FILTER = 4; // percobaan total saat keluaran ditolak filter keamanan
const SAMA_DENGAN_FILTER = /flagged/i;

/** Ukuran generate untuk rasio w:h: sisi terpanjang 1024, kelipatan 16, dalam rentang 256-1920 yang diterima model. */
export function ukuranGenerate(w: number, h: number): { width: number; height: number } {
  const skala = MAX_SISI / Math.max(w, h);
  const bulat = (n: number) => Math.min(1920, Math.max(256, Math.round((n * skala) / 16) * 16));
  return { width: bulat(w), height: bulat(h) };
}

/** Perkiraan neuron satu panggilan (tile = 512x512). Gambar input selalu di bawah 512 px, jadi masing-masing satu tile. */
export function perkiraanNeuron(width: number, height: number, jumlahInput: number): number {
  const tiles = Math.ceil(width / 512) * Math.ceil(height / 512);
  return tiles * NEURON_OUTPUT_PER_TILE + jumlahInput * NEURON_INPUT_PER_TILE;
}

type Gambar = { data: Uint8Array; mimeType: string };

/**
 * FLUX.2 [klein] 4B lewat Cloudflare Workers AI (kuota gratis 10.000 neuron/hari).
 * Model ini tidak andal menggambar banyak panel sekaligus, jadi halaman dibuat per panel lalu digabung.
 */
export class CloudflareImageProvider implements ImageProvider {
  readonly name = "cloudflare";

  async generatePage(req: PageImageRequest): Promise<PageImageResult> {
    if (req.panels.length < 1) throw new Error("Halaman tanpa panel");
    const refs = (req.referenceImages ?? []).slice(0, MAX_REF);
    const tempel: OverlayOptions[] = [];
    // berurutan, bukan paralel, agar tidak kena batas laju akun gratis
    for (const panel of req.panels) {
      const left = Math.round(panel.rect.x * PAGE_PX.w);
      const top = Math.round(panel.rect.y * PAGE_PX.h);
      const width = Math.max(1, Math.round(panel.rect.w * PAGE_PX.w));
      const height = Math.max(1, Math.round(panel.rect.h * PAGE_PX.h));
      const img = await this.run(buildPanelPrompt(panel, { ...req, referenceImages: refs }), refs, ukuranGenerate(width, height));
      tempel.push({ input: await sharp(img).resize({ width, height, fit: "cover" }).toBuffer(), left, top });
    }
    const image = await sharp({ create: { width: PAGE_PX.w, height: PAGE_PX.h, channels: 3, background: "#ffffff" } })
      .composite(tempel)
      .png()
      .toBuffer();
    return { image: new Uint8Array(image), mimeType: "image/png", provider: this.name, model: CF_IMAGE_MODEL };
  }

  async editPanel(req: PanelEditRequest): Promise<PageImageResult> {
    const meta = await sharp(req.image.data).metadata();
    // FLUX.2 menyebut gambar input mulai dari 0; prompt edit memakai urutan 1, 2, ...
    const prompt = `${buildEditPrompt(req)}\n\nUrutan gambar input: image 0 = panel yang diubah, image 1 dan seterusnya = referensi tambahan sesuai urutan di atas.`;
    const refs = [req.image, ...(req.referenceImages ?? []).slice(0, MAX_REF - 1)];
    const img = await this.run(prompt, refs, ukuranGenerate(meta.width ?? 768, meta.height ?? 768));
    return { image: new Uint8Array(img), mimeType: "image/png", provider: this.name, model: CF_IMAGE_MODEL };
  }

  async generatePortrait(req: PortraitRequest): Promise<PageImageResult> {
    const refs = (req.referenceImages ?? []).slice(0, MAX_REF);
    const ukuran = req.bentuk === "badan" ? ukuranGenerate(3, 4) : ukuranGenerate(1, 1);
    const img = await this.run(buildPortraitPrompt(req), refs, ukuran);
    return { image: new Uint8Array(img), mimeType: "image/png", provider: this.name, model: CF_IMAGE_MODEL };
  }

  private async run(prompt: string, refs: Gambar[], ukuran: { width: number; height: number }): Promise<Buffer> {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const token = process.env.CLOUDFLARE_API_TOKEN;
    if (!accountId || !token) throw new Error("CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN belum diatur");

    const form = new FormData();
    form.append("prompt", prompt);
    form.append("width", String(ukuran.width));
    form.append("height", String(ukuran.height));
    const kecil = await Promise.all(
      refs.map((r) => sharp(r.data).resize({ width: REF_MAKS_PX, height: REF_MAKS_PX, fit: "inside", withoutEnlargement: true }).png().toBuffer()),
    );
    kecil.forEach((buf, i) => form.append(`input_image_${i}`, new Blob([new Uint8Array(buf)], { type: "image/png" }), `ref-${i}.png`));

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${CF_IMAGE_MODEL}`;
    const started = Date.now();
    for (let attempt = 1; ; attempt++) {
      const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        errors?: { code?: number; message?: string }[];
        result?: { image?: string };
      } | null;
      const base64 = json?.result?.image;
      if (res.ok && base64) {
        const pakai = catatBiaya(CF_IMAGE_MODEL, perkiraanNeuron(ukuran.width, ukuran.height, refs.length) * USD_PER_NEURON);
        console.info(JSON.stringify({ ai: "cloudflare-image", ...pakai, ...ukuran, refs: refs.length, ms: Date.now() - started }));
        return Buffer.from(base64, "base64");
      }
      const pesan = json?.errors?.map((e) => `${e.code ?? ""} ${e.message ?? ""}`.trim()).join("; ") || res.statusText;
      // filter keamanan menolak keluaran ("output flagged"), sering salah sasaran pada gambar anak-anak; hasilnya acak,
      // jadi mencoba lagi dengan sedikit variasi komposisi biasanya lolos (jarang sampai empat kali)
      if (attempt < MAX_COBA_FILTER && res.status === 400 && SAMA_DENGAN_FILTER.test(pesan)) {
        form.set("prompt", `${prompt}\nVariasi komposisi ${attempt}.`);
        continue;
      }
      if (attempt < 3 && RETRYABLE.has(res.status)) {
        await new Promise((r) => setTimeout(r, 3000 * attempt));
        continue;
      }
      throw Object.assign(new Error(`Cloudflare AI ${res.status}: ${pesan}`), { status: res.status });
    }
  }
}
