"use client";

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type Konva from "konva";
import { Layer, Stage } from "react-konva";
import { buatPdf } from "@/lib/editor/ekspor-pdf";
import { PAGE_H, PAGE_W, type EditorPage } from "@/lib/editor/types";
import { HalamanStatis } from "./bentuk-halaman";

/** Skala render: 1,5 kali ukuran kanvas (1350 x 1800 px) cukup tajam untuk dibaca dan dicetak tanpa membuat PDF terlalu besar. */
const PIXEL_RATIO = 1.5;

/** Muat semua gambar halaman dengan CORS aktif (wajib agar kanvas boleh diekspor). Gagal bila ada yang tidak bisa dimuat. */
export async function muatGambar(urls: string[]): Promise<Map<string, HTMLImageElement>> {
  const hasil = new Map<string, HTMLImageElement>();
  await Promise.all(
    [...new Set(urls)].map(
      (url) =>
        new Promise<void>((selesai, gagal) => {
          const el = new window.Image();
          el.crossOrigin = "anonymous";
          el.onload = () => {
            hasil.set(url, el);
            selesai();
          };
          el.onerror = () => gagal(new Error("GAMBAR_GAGAL"));
          el.src = url;
        }),
    ),
  );
  return hasil;
}

function base64KeBytes(dataUrl: string): Uint8Array {
  const biner = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const bytes = new Uint8Array(biner.length);
  for (let i = 0; i < biner.length; i++) bytes[i] = biner.charCodeAt(i);
  return bytes;
}

/** Gambar satu halaman ke JPEG lewat kanvas Konva di luar layar, memakai komponen gambar yang sama dengan editor. */
async function renderJpeg(page: EditorPage, gambar: Map<string, HTMLImageElement>, fontFamily: string): Promise<Uint8Array> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = `position:fixed;left:-99999px;top:0;width:${PAGE_W}px;height:${PAGE_H}px;pointer-events:none`;
  document.body.appendChild(host);
  const root = createRoot(host);
  let stage: Konva.Stage | null = null;
  try {
    flushSync(() =>
      root.render(
        <Stage
          width={PAGE_W}
          height={PAGE_H}
          ref={(s) => {
            stage = s;
          }}
        >
          <Layer>
            <HalamanStatis page={page} gambar={gambar} fontFamily={fontFamily} />
          </Layer>
        </Stage>,
      ),
    );
    if (!stage) throw new Error("Kanvas ekspor gagal dibuat");
    return base64KeBytes((stage as Konva.Stage).toDataURL({ pixelRatio: PIXEL_RATIO, mimeType: "image/jpeg", quality: 0.92 }));
  } finally {
    root.unmount();
    host.remove();
  }
}

export type KemajuanEkspor = (selesai: number, total: number) => void;

/** Siapkan font dan gambar, lalu render setiap halaman menjadi JPEG (urut). Dipakai ekspor PDF dan penerbitan ke komunitas. */
export async function renderSemuaHalaman(pages: EditorPage[], fontFamily: string, kemajuan?: KemajuanEkspor): Promise<Uint8Array[]> {
  // font balon harus sudah termuat sebelum teks diukur, kalau tidak teks memakai font cadangan
  await document.fonts.load(`bold 24px ${fontFamily}`).catch(() => []);
  await document.fonts.ready;
  const gambar = await muatGambar(pages.flatMap((p) => p.panels.filter((x) => x.visible && x.imageUrl).map((x) => x.imageUrl as string)));

  const jpegs: Uint8Array[] = [];
  for (let i = 0; i < pages.length; i++) {
    kemajuan?.(i, pages.length);
    jpegs.push(await renderJpeg(pages[i], gambar, fontFamily));
    // beri browser kesempatan menggambar kemajuan dan melepas memori kanvas
    await new Promise((r) => setTimeout(r, 0));
  }
  kemajuan?.(pages.length, pages.length);
  return jpegs;
}

/** Semua halaman komik menjadi satu PDF (berkas siap diunduh). */
export async function eksporKomikKePdf(pages: EditorPage[], judul: string, fontFamily: string, kemajuan?: KemajuanEkspor): Promise<Uint8Array> {
  return buatPdf(await renderSemuaHalaman(pages, fontFamily, kemajuan), judul);
}
