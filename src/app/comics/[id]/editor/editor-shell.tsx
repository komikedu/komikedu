"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Apple,
  ChevronDown,
  Copy,
  Download,
  Eye,
  EyeOff,
  FilePlus,
  Home,
  Loader2,
  MousePointer2,
  Plus,
  Redo2,
  Scissors,
  Sparkles,
  Sticker,
  Trash2,
  Type,
  Undo2,
  Upload,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { LAYOUTS } from "@/lib/ai/layouts";
import { PageThumb } from "@/components/page-thumb";
import type { HalamanThumb } from "@/lib/comics/thumb";
import { MAX_PANELS_PER_PAGE } from "@/lib/editor/panel-ops";
import { MAX_PAGES } from "@/lib/editor/persist";
import { jumlahBendaDiAdegan } from "@/lib/ai/jumlah";
import { IKON_BENDA, MAX_JUMLAH, MAX_KOLOM, namaIkon } from "@/lib/editor/math-elements";
import { applyPanelImages, clearHistory, redo, selectSelectedBubble, selectSelectedElement, selectSelectedPanel, undo, useEditor } from "@/lib/editor/store";
import type { BubbleKind, EditorPage, MathElement, Panel as EditorPanel } from "@/lib/editor/types";
import { GAYA } from "@/lib/comics/schema";
import { alamatPotret, buatPromptFlow, rasioTerdekat, tokohDiTeks } from "@/lib/comics/prompt-flow";
import type { Tokoh } from "@/lib/comics/tokoh";
import { AdeganInput, NamaTokohContext } from "./adegan-input";
import { LatarSection } from "./latar-section";
import { PilihBentukBalon } from "./pilih-bentuk-balon";
import { IkatPanel, Putaran, StikerTab, TeksTab } from "./teks-tab";
import { DialogTokohNaskah } from "./dialog-tokoh-naskah";
import { hapusLatar, siapkanHapusLatar } from "./hapus-latar";
import { kecilkanGambar } from "./kecilkan-gambar";
import { TokohTab } from "./tokoh-tab";
import { TombolTerbit } from "./tombol-terbit";
import { namaBerkasAcuan, unduhPotret } from "./unduh-potret";
import { useVersiGambar } from "./use-versi-gambar";

const EditorCanvas = dynamic(() => import("./editor-canvas"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-gray-500">Memuat kanvas...</div>,
});

const KIND_LABEL: Record<BubbleKind, string> = { bicara: "Bicara", pikir: "Pikir", narasi: "Narasi" };

function ToolButton({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex w-14 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-brand text-brand-foreground" : "hover:bg-surface-muted"
      }`}
    >
      {children}
      {label}
    </button>
  );
}

/** Halaman editor sebagai data thumbnail: panel dengan gambarnya di posisi aslinya. */
function thumbHalaman(page: EditorPage): HalamanThumb {
  return {
    panels: page.panels.filter((p) => p.visible).map((p) => ({ x: p.x, y: p.y, w: p.w, h: p.h, corners: p.corners ?? undefined, gambar: p.imageRect ?? undefined, latar: p.latar ?? undefined, imageUrl: p.imageUrl })),
  };
}

/** Unduh seluruh komik sebagai PDF. Dirender di browser dari isi editor saat ini, jadi hasilnya sama dengan yang terlihat. */
function TombolEkspor({ judul, fontFamily }: { judul: string; fontFamily: string }) {
  const [kemajuan, setKemajuan] = useState<{ selesai: number; total: number } | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  async function ekspor() {
    const pages = useEditor.getState().pages;
    setGalat(null);
    setKemajuan({ selesai: 0, total: pages.length });
    try {
      const [{ eksporKomikKePdf }, { namaBerkasPdf }] = await Promise.all([import("./render-halaman"), import("@/lib/editor/ekspor-pdf")]);
      const bytes = await eksporKomikKePdf(pages, judul, fontFamily, (selesai, total) => setKemajuan({ selesai, total }));
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = namaBerkasPdf(judul);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      console.error("ekspor PDF gagal", e);
      const gambarGagal = (e instanceof Error && e.message === "GAMBAR_GAGAL") || (e instanceof DOMException && e.name === "SecurityError");
      setGalat(
        gambarGagal
          ? "Ada gambar yang tidak bisa dimuat untuk diekspor. Periksa koneksi, lalu coba lagi. Bila terus gagal, aturan CORS bucket gambar mungkin belum benar."
          : "Gagal membuat PDF. Coba lagi.",
      );
    } finally {
      setKemajuan(null);
    }
  }

  return (
    <div className="flex flex-1">
      <button
        type="button"
        onClick={() => void ekspor()}
        disabled={kemajuan !== null}
        title="Unduh seluruh komik sebagai PDF"
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground disabled:opacity-60"
      >
        {kemajuan ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
        {kemajuan ? `Halaman ${Math.min(kemajuan.selesai + 1, kemajuan.total)}/${kemajuan.total}` : "Ekspor PDF"}
      </button>
      {galat && (
        <p role="alert" className="absolute inset-x-0 top-full z-30 mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 shadow-lg">
          {galat}
        </p>
      )}
    </div>
  );
}

function PagesPanel() {
  const pages = useEditor((s) => s.pages);
  const activeId = useEditor((s) => s.activePageId);
  const setActive = useEditor((s) => s.setActivePage);
  const addPage = useEditor((s) => s.addPage);
  const insertAfter = useEditor((s) => s.insertPageAfter);
  const duplicate = useEditor((s) => s.duplicatePage);
  const remove = useEditor((s) => s.deletePage);
  const [picking, setPicking] = useState(false);
  const penuh = pages.length >= MAX_PAGES;
  const aksi = "grid h-6 w-6 place-items-center rounded text-white hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40";

  function hapus(p: EditorPage, nomor: number) {
    const berisi = p.bubbles.length > 0 || p.elements.length > 0 || p.panels.some((x) => x.imageUrl || x.adegan.trim());
    if (berisi && !window.confirm(`Hapus halaman ${nomor} beserta isinya?`)) return;
    remove(p.id);
  }

  return (
    <section aria-label="Halaman" className="border-b border-line p-3">
      <div className="flex items-center justify-between text-sm">
        <h2 className="font-semibold">Halaman</h2>
        <span className="text-xs text-gray-500">
          {pages.findIndex((p) => p.id === activeId) + 1} dari {pages.length}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {pages.map((p, i) => {
          const thumb = thumbHalaman(p);
          const adaGambar = thumb.panels.some((x) => x.imageUrl);
          return (
            <div key={p.id} className="group relative">
              <button
                type="button"
                onClick={() => setActive(p.id)}
                aria-current={p.id === activeId}
                aria-label={`Halaman ${i + 1}`}
                className={`relative block w-full overflow-hidden rounded border ${p.id === activeId ? "border-brand ring-2 ring-brand/30" : "border-line"}`}
              >
                <PageThumb halaman={thumb} />
                {!adaGambar && <span className="absolute inset-0 grid place-items-center text-sm text-gray-600">{i + 1}</span>}
              </button>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between rounded-b bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
                <span className="text-sm font-bold text-white">{i + 1}</span>
                <span className="pointer-events-auto flex gap-0.5">
                  <button type="button" title="Sisipkan halaman setelah ini" aria-label={`Sisipkan halaman setelah halaman ${i + 1}`} disabled={penuh} onClick={() => insertAfter(p.id)} className={aksi}>
                    <FilePlus size={14} />
                  </button>
                  <button type="button" title="Duplikat halaman" aria-label={`Duplikat halaman ${i + 1}`} disabled={penuh} onClick={() => duplicate(p.id)} className={aksi}>
                    <Copy size={14} />
                  </button>
                  <button type="button" title="Hapus halaman" aria-label={`Hapus halaman ${i + 1}`} disabled={pages.length <= 1} onClick={() => hapus(p, i + 1)} className={aksi}>
                    <Trash2 size={14} />
                  </button>
                </span>
              </div>
            </div>
          );
        })}
        <div className="relative">
          <button
            type="button"
            onClick={() => setPicking((v) => !v)}
            aria-expanded={picking}
            disabled={penuh}
            className="grid aspect-[3/4] w-full place-items-center rounded border border-dashed border-line text-xs text-gray-500 hover:bg-surface-muted disabled:opacity-40"
          >
            <span className="flex flex-col items-center">
              <Plus size={16} />
              Tambah
            </span>
          </button>
          {picking && (
            <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-line bg-surface p-2 shadow-lg">
              <p className="px-1 pb-1 text-xs text-gray-500">Pilih layout</p>
              {LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    addPage(l.id);
                    setPicking(false);
                  }}
                  className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-surface-muted"
                >
                  {l.nama}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function LayersPanel() {
  const page = useEditor((s) => s.pages.find((p) => p.id === s.activePageId));
  const selectedLayer = useEditor((s) => s.selectedLayer);
  const selectImage = useEditor((s) => s.selectImage);
  const updateElement = useEditor((s) => s.updateElement);
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);
  const update = useEditor((s) => s.updateBubble);
  if (!page) return null;

  return (
    <section aria-label="Layer" className="min-h-0 flex-1 overflow-y-auto p-3">
      <h2 className="text-sm font-semibold">Layer</h2>
      <ul className="mt-2 space-y-1">
        {page.panels.map((panel, i) => (
          <li key={panel.id}>
            <button
              type="button"
              onClick={() => select(panel.id)}
              aria-current={panel.id === selectedId && selectedLayer === "panel"}
              className={`flex w-full items-center gap-1 rounded-md px-1 py-1 text-left text-sm font-medium ${
                panel.id === selectedId && selectedLayer === "panel" ? "bg-blue-600 text-white" : "hover:bg-surface-muted"
              }`}
            >
              <ChevronDown size={14} /> Panel {i + 1}
            </button>
            <ul className="ml-4 space-y-1">
              {page.bubbles
                .filter((b) => b.panelId === panel.id)
                .map((b) => (
                  <li key={b.id}>
                    <div
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${b.id === selectedId ? "bg-brand text-brand-foreground" : "hover:bg-surface-muted"}`}
                    >
                      <button
                        type="button"
                        aria-label={b.visible ? "Sembunyikan layer" : "Tampilkan layer"}
                        onClick={() => update(b.id, { visible: !b.visible })}
                      >
                        {b.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button type="button" onClick={() => select(b.id)} className="min-w-0 flex-1 truncate text-left">
                        <span className="mr-1 inline-grid h-5 w-5 place-items-center rounded bg-white/70 text-[10px] font-bold text-gray-700">T</span>
                        {b.text || "(kosong)"}
                      </button>
                    </div>
                  </li>
                ))}
              {page.elements
                .filter((e) => e.panelId === panel.id)
                .map((e) => (
                  <BarisElemen key={e.id} e={e} aktif={e.id === selectedId} onPilih={() => select(e.id)} onTampil={() => updateElement(e.id, { visible: !e.visible })} />
                ))}
              <li>
                {panel.imageUrl ? (
                  <button
                    type="button"
                    onClick={() => selectImage(panel.id)}
                    title="Geser atau ubah ukuran gambar"
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
                      panel.id === selectedId && selectedLayer === "gambar" ? "bg-blue-600 text-white" : "hover:bg-surface-muted"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={panel.imageUrl} alt="" className="h-6 w-6 rounded object-cover" />
                    Gambar
                  </button>
                ) : (
                  <span className="block px-2 py-1 text-xs text-gray-500">Gambar: belum dibuat</span>
                )}
              </li>
            </ul>
          </li>
        ))}
      </ul>
      {page.elements.some((e) => e.panelId === null) && (
        <div className="mt-2">
          <p className="px-1 py-1 text-sm font-medium">Di luar panel</p>
          <ul className="ml-4 space-y-1">
            {page.elements
              .filter((e) => e.panelId === null)
              .map((e) => (
                <BarisElemen key={e.id} e={e} aktif={e.id === selectedId} onPilih={() => select(e.id)} onTampil={() => updateElement(e.id, { visible: !e.visible })} />
              ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Satu baris elemen (teks bergaya atau kumpulan benda) di daftar layer. */
function BarisElemen({ e, aktif, onPilih, onTampil }: { e: MathElement; aktif: boolean; onPilih: () => void; onTampil: () => void }) {
  return (
    <li>
      <div className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${aktif ? "bg-violet-600 text-white" : "hover:bg-surface-muted"}`}>
        <button type="button" aria-label={e.visible ? "Sembunyikan elemen" : "Tampilkan elemen"} onClick={onTampil}>
          {e.visible ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
        <button type="button" onClick={onPilih} className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-left">
          {e.kind === "teks" ? <Zap size={13} className="shrink-0" /> : e.kind === "stiker" ? <Sticker size={13} className="shrink-0" /> : <Apple size={13} className="shrink-0" />}
          {e.kind === "teks" ? e.text || "(kosong)" : e.kind === "stiker" ? "Stiker" : `${e.jumlah} ${namaIkon(e.ikon)}`}
        </button>
      </div>
    </li>
  );
}

type GenerateProps = {
  tersimpan: boolean;
  saldo: number;
  generating: boolean;
  error: string | null;
  onGenerate: () => void;
  melengkapi: boolean;
  pesanLengkapi: { ok: boolean; teks: string } | null;
  onLengkapi: () => void;
};

const GAMBAR_COST = 1;
const EDIT_COST = 1;

type EditAiProps = {
  tersimpan: boolean;
  saldo: number;
  /** id panel yang sedang diedit AI, atau halaman sedang dibuat gambarnya */
  sibuk: string | null;
  /** kembalikan pesan galat, atau null bila berhasil */
  onEdit: (panelId: string, instruksi: string) => Promise<string | null>;
  /** unggah gambar sendiri ke panel (gratis); kembalikan pesan galat, atau null bila berhasil */
  onUnggah: (panelId: string, file: File, sumber?: "tanpa-latar") => Promise<string | null>;
  comicId?: string;
  tokoh: Tokoh[];
  gaya: string | null;
};

/** Prompt siap tempel untuk Google Flow, plus potret tokoh yang bisa diunduh sebagai gambar acuan. */
function FlowSection({ panel, ai }: { panel: EditorPanel; ai: EditAiProps }) {
  const bubbles = useEditor((s) => s.pages.find((p) => p.id === s.activePageId)?.bubbles ?? []);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);
  const [terunduh, setTerunduh] = useState<Record<string, boolean>>({});
  const adegan = panel.adegan.trim();
  const tampil = tokohDiTeks(ai.tokoh, [adegan, ...bubbles.filter((b) => b.panelId === panel.id).map((b) => b.text)].join(" "));
  const bergambar = tampil.filter((t) => alamatPotret(t, ai.gaya));
  const acuan = Object.fromEntries(bergambar.filter((t) => terunduh[t.nama]).map((t) => [t.nama, namaBerkasAcuan(t.nama)]));
  const rasio = rasioTerdekat(panel.w, panel.h);
  const gayaPrompt = (GAYA.find((g) => g.id === ai.gaya) ?? GAYA[0]).prompt;
  const prompt = adegan ? buatPromptFlow({ adegan, gaya: gayaPrompt, tokoh: tampil, rasio, acuan }) : "";

  async function salin() {
    try {
      await navigator.clipboard.writeText(prompt);
      setPesan({ ok: true, teks: "Prompt disalin. Tempel di Google Flow." });
    } catch {
      setPesan({ ok: false, teks: "Gagal menyalin. Pilih teks prompt lalu salin manual." });
    }
  }

  async function unduh(t: Tokoh) {
    const url = alamatPotret(t, ai.gaya);
    const ok = !!url && (await unduhPotret(url, namaBerkasAcuan(t.nama)));
    if (ok) setTerunduh((s) => ({ ...s, [t.nama]: true }));
    setPesan(ok ? { ok: true, teks: `Potret ${t.nama} terunduh. Unggah sebagai gambar acuan di Flow.` } : { ok: false, teks: `Gagal mengunduh potret ${t.nama}.` });
  }

  return (
    <div className="rounded-lg border border-line p-3">
      <p className="font-semibold">Buat di Google Flow</p>
      <p className="mt-1 text-xs text-gray-500">
        Salin prompt ini ke Flow, buat gambarnya (pilih rasio {rasio}), lalu unggah hasilnya ke panel ini. Tanpa kredit.
      </p>
      {adegan ? (
        <>
          <textarea
            readOnly
            aria-label="Prompt untuk Google Flow"
            value={prompt}
            rows={7}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-2 w-full resize-y rounded-lg border border-line bg-surface-muted p-2 text-xs"
          />
          <button type="button" onClick={() => void salin()} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold hover:bg-surface-muted">
            <Copy size={14} /> Salin prompt
          </button>
        </>
      ) : (
        <p className="mt-2 text-xs text-amber-700">Isi adegan panel dulu, lalu prompt akan muncul di sini.</p>
      )}
      {bergambar.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-600">Gambar acuan tokoh (unggah di Flow agar wajahnya konsisten)</p>
          <ul className="mt-1 space-y-1">
            {bergambar.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => void unduh(t)} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-surface-muted">
                  <Download size={13} /> {terunduh[t.nama] ? `Unduh lagi: ${t.nama}` : `Unduh potret ${t.nama}`}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {tampil.length > bergambar.length && (
        <p className="mt-2 text-xs text-gray-500">
          {tampil.filter((t) => !alamatPotret(t, ai.gaya)).map((t) => t.nama).join(", ")} belum punya potret; buat dulu di tab Tokoh bila ingin dipakai sebagai acuan.
        </p>
      )}
      {pesan && (
        <p role={pesan.ok ? "status" : "alert"} className={`mt-2 text-xs ${pesan.ok ? "text-emerald-700" : "text-red-700"}`}>
          {pesan.teks}
        </p>
      )}
    </div>
  );
}

/** Unggah gambar sendiri ke panel, mis. hasil Google Flow. Tersedia di panel kosong maupun yang sudah bergambar. */
function UnggahGambarSection({ panelId, ada, ai }: { panelId: string; ada: boolean; ai: EditAiProps }) {
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const jalan = ai.sibuk === panelId;

  async function pilih(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return setError("Gambar harus berformat JPG, PNG, atau WebP.");
    setError(null);
    setError(await ai.onUnggah(panelId, file));
  }

  return (
    <div className="rounded-lg border border-line p-3">
      <p className="font-semibold">{ada ? "Ganti dengan gambar sendiri" : "Unggah gambar panel"}</p>
      <p className="mt-1 text-xs text-gray-500">Pakai gambar dari Google Flow atau sumber lain. Gratis, tanpa kredit.</p>
      <button
        type="button"
        disabled={!ai.tersimpan || !!ai.sibuk}
        onClick={() => fileRef.current?.click()}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
      >
        {jalan ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {jalan ? "Mengunggah..." : "Unggah gambar"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        aria-label="Unggah gambar panel"
        onChange={(e) => {
          void pilih(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

/** Salin gambar panel menjadi stiker bebas di halaman (terbaik setelah latarnya dihapus). */
function StikerSection({ imageUrl }: { imageUrl: string }) {
  const addStiker = useEditor((s) => s.addStiker);
  const [error, setError] = useState<string | null>(null);

  function jadikan() {
    setError(null);
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => addStiker(imageUrl, img.width / img.height);
    img.onerror = () => setError("Gambar tidak bisa dimuat. Coba lagi.");
    img.src = imageUrl;
  }

  return (
    <div className="rounded-lg border border-line p-3">
      <p className="font-semibold">Jadikan stiker</p>
      <p className="mt-1 text-xs text-gray-500">Taruh gambar ini di halaman sebagai stiker bebas yang bisa digeser, diperbesar, dan diputar. Paling bagus setelah latarnya dihapus.</p>
      <button type="button" onClick={jadikan} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold hover:bg-surface-muted">
        <Sticker size={14} /> Jadikan stiker
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

/** Hapus latar gambar panel (karakter saja) di peramban; hasilnya jadi versi baru di riwayat. Gratis, tanpa kredit. */
function HapusLatarSection({ panelId, imageUrl, ai }: { panelId: string; imageUrl: string; ai: EditAiProps }) {
  const [tahap, setTahap] = useState<"diam" | "proses">("diam");
  const [error, setError] = useState<string | null>(null);
  const jalan = tahap === "proses";

  async function mulai() {
    setError(null);
    setTahap("proses");
    try {
      const file = await hapusLatar(imageUrl);
      setError(await ai.onUnggah(panelId, file, "tanpa-latar"));
    } catch {
      setError("Gagal menghapus latar. Periksa koneksi lalu coba lagi.");
    } finally {
      setTahap("diam");
    }
  }

  return (
    <div className="rounded-lg border border-line p-3">
      <p className="font-semibold">Hapus latar</p>
      <p className="mt-1 text-xs text-gray-500">
        Sisakan karakternya saja, lalu pilih pola latar di atas. Gratis, diproses di perangkat Anda. Paling cocok untuk satu tokoh; pemakaian pertama mengunduh model ±26 MB.
      </p>
      <button
        type="button"
        disabled={!ai.tersimpan || !!ai.sibuk || jalan}
        onMouseEnter={siapkanHapusLatar}
        onFocus={siapkanHapusLatar}
        onClick={() => void mulai()}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
      >
        {jalan ? <Loader2 size={14} className="animate-spin" /> : <Scissors size={14} />} {jalan ? "Menghapus latar..." : "Hapus latar"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function EditAiSection({ panelId, ai }: { panelId: string; ai: EditAiProps }) {
  const [instruksi, setInstruksi] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [berhasil, setBerhasil] = useState(false);
  const jalan = ai.sibuk === panelId;
  const kurang = ai.saldo < EDIT_COST;
  const valid = instruksi.trim().length >= 3;

  async function kirim() {
    setError(null);
    setBerhasil(false);
    const err = await ai.onEdit(panelId, instruksi.trim());
    if (err) setError(err);
    else {
      setInstruksi("");
      setBerhasil(true);
    }
  }

  return (
    <div className="rounded-lg border border-line p-3">
      <p className="flex items-center gap-1.5 font-semibold">
        <Sparkles size={14} className="text-brand" /> Edit gambar dengan AI
      </p>
      <p className="mt-1 text-xs text-gray-500">Tulis bagian yang ingin diubah. Bagian lain gambar dipertahankan.</p>
      <textarea
        aria-label="Perintah edit gambar"
        rows={3}
        maxLength={300}
        value={instruksi}
        onChange={(e) => setInstruksi(e.target.value)}
        placeholder="mis. buat Doni tersenyum, ganti latar jadi kelas, hapus kucing di belakang"
        className="mt-2 w-full rounded border border-line px-2 py-1.5 text-xs"
      />
      <button
        type="button"
        disabled={!ai.tersimpan || ai.sibuk !== null || kurang || !valid}
        onClick={() => void kirim()}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {jalan ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {jalan ? "Mengubah gambar..." : `Ubah gambar · ${EDIT_COST} kredit`}
      </button>
      {jalan && <p role="status" className="mt-2 text-xs text-gray-600">Biasanya 15 sampai 40 detik.</p>}
      {kurang && !jalan && <p className="mt-2 text-xs text-amber-700">Kredit tidak cukup.</p>}
      {!ai.tersimpan && <p className="mt-2 text-xs text-gray-500">Hanya tersedia di komik yang tersimpan.</p>}
      {berhasil && <p role="status" className="mt-2 text-xs text-emerald-700">Gambar diperbarui. Belum pas? Tulis perintah lain, atau kembali ke gambar sebelumnya dengan tombol panah di atas panel.</p>}
      {error && (
        <p role="alert" className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700">
          {error}
        </p>
      )}
      <p className="mt-2 text-xs text-gray-500">Jumlah benda yang harus pasti? Pakai alat Elemen Mat, bukan AI.</p>
    </div>
  );
}

function PageTab({ page, gen }: { page: EditorPage; gen: GenerateProps }) {
  const updatePanel = useEditor((s) => s.updatePanel);
  const tanpaAdegan = page.panels.findIndex((p) => !p.adegan.trim());
  const sudahAdaGambar = page.panels.some((p) => p.imageUrl);
  const kurang = gen.saldo < GAMBAR_COST;
  return (
    <div className="space-y-4 p-4 text-sm">
      <div>
        <h3 className="font-semibold">Naskah halaman</h3>
        <p className="mt-1 text-xs text-gray-500">Gambar dibuat dari adegan ini. Ketik @ untuk menyebut tokoh agar wajahnya sesuai.</p>
        <ol className="mt-2 space-y-2">
          {page.panels.map((p, i) => (
            <li key={p.id} className="rounded border border-line p-2">
              <p className="text-xs font-semibold">Panel {i + 1}</p>
              <AdeganInput
                label={`Adegan panel ${i + 1}`}
                value={p.adegan}
                onChange={(v) => updatePanel(p.id, { adegan: v })}
                className="mt-1"
                peringatan={!p.adegan.trim()}
              />
              {jumlahBendaDiAdegan(p.adegan).length > 0 && (
                <p className="mt-1 text-xs text-amber-800">
                  Gambar AI bisa salah hitung ({jumlahBendaDiAdegan(p.adegan).join(", ")}). Pakai alat Elemen Mat agar jumlahnya pasti.
                </p>
              )}
            </li>
          ))}
        </ol>
        {tanpaAdegan >= 0 && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-900">Ada panel tanpa naskah. AI bisa menuliskan adegan dan dialognya agar menyambung dengan panel lain.</p>
            <button
              type="button"
              disabled={!gen.tersimpan || gen.melengkapi || gen.generating}
              onClick={gen.onLengkapi}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand bg-surface px-3 py-2 text-xs font-semibold text-brand hover:bg-brand/5 disabled:opacity-50"
            >
              {gen.melengkapi ? "Menulis naskah..." : "Lengkapi naskah dengan AI (gratis)"}
            </button>
          </div>
        )}
        {gen.pesanLengkapi && (
          <p role={gen.pesanLengkapi.ok ? "status" : "alert"} className={`mt-2 rounded p-2 text-xs ${gen.pesanLengkapi.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
            {gen.pesanLengkapi.teks}
          </p>
        )}
      </div>
      <div>
        <h3 className="font-semibold">Gambar halaman</h3>
        <p className="mt-1 text-xs text-gray-500">
          Satu gambar untuk semua panel, lalu dipotong per panel. {GAMBAR_COST} kredit per halaman, dikembalikan bila gagal.
        </p>
        <button
          type="button"
          disabled={!gen.tersimpan || gen.generating || kurang || tanpaAdegan >= 0}
          onClick={gen.onGenerate}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
        >
          {gen.generating ? "Membuat gambar..." : `${sudahAdaGambar ? "Buat ulang gambar" : "Buat gambar halaman"} · ${GAMBAR_COST} kredit`}
        </button>
        {gen.generating && <p role="status" className="mt-2 text-xs text-gray-600">Biasanya 20 sampai 60 detik. Jangan tutup halaman ini.</p>}
        {sudahAdaGambar && !gen.generating && <p className="mt-2 text-xs text-gray-500">Gambar lama tidak hilang: pilih sebuah panel, lalu pakai tombol panah ‹ › di toolbar untuk kembali ke versi sebelumnya.</p>}
        {!gen.tersimpan && <p className="mt-2 text-xs text-gray-500">Hanya tersedia di komik yang tersimpan.</p>}
        {tanpaAdegan >= 0 && <p className="mt-2 text-xs text-amber-700">Panel {tanpaAdegan + 1} belum punya adegan. Pilih panelnya lalu isi adegan.</p>}
        {kurang && <p className="mt-2 text-xs text-danger">Kredit tidak cukup.</p>}
        {gen.error && (
          <p role="alert" className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700">
            {gen.error}
          </p>
        )}
      </div>
    </div>
  );
}

/** Galeri gambar sebuah panel: semua versi yang pernah dipakai, klik untuk memasang kembali. Tidak ada yang dibuang. */
function RiwayatGambar({ riwayat }: { riwayat: ReturnType<typeof useVersiGambar> }) {
  const { versi, index, pasang, sibuk, galat } = riwayat;
  return (
    <div className="rounded-lg border border-line p-3">
      <p className="font-semibold">Riwayat gambar ({versi.length})</p>
      <p className="mt-1 text-xs text-gray-500">Semua gambar panel ini tersimpan. Klik untuk memasang kembali, tanpa kredit.</p>
      <ul aria-label="Riwayat gambar panel" className="mt-2 grid grid-cols-3 gap-2">
        {versi.map((v, i) => (
          <li key={v.id}>
            <button
              type="button"
              disabled={sibuk}
              aria-pressed={i === index}
              aria-label={`Versi ${i + 1}${i === index ? ", sedang dipakai" : ""}`}
              title={v.sumber === "edit" ? "Hasil edit AI" : v.sumber === "salinan" ? "Salinan dari panel lain" : v.sumber === "unggah" ? "Gambar unggahan sendiri" : v.sumber === "tanpa-latar" ? "Latar dihapus (karakter saja)" : "Hasil buat gambar halaman"}
              onClick={() => void pasang(v)}
              className={`relative block aspect-[3/4] w-full overflow-hidden rounded-md bg-surface-muted ${i === index ? "ring-2 ring-brand" : "hover:ring-2 hover:ring-line"}`}
            >
              <Image src={v.url} alt="" fill unoptimized crossOrigin="anonymous" className="object-cover" />
              <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[10px] text-white">{i + 1}</span>
            </button>
          </li>
        ))}
      </ul>
      {galat && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {galat}
        </p>
      )}
    </div>
  );
}

function PanelTab({ ai }: { ai: EditAiProps }) {
  const panel = useEditor(selectSelectedPanel);
  const page = useEditor((s) => s.pages.find((p) => p.id === s.activePageId));
  const split = useEditor((s) => s.splitPanel);
  const dup = useEditor((s) => s.duplicatePanel);
  const del = useEditor((s) => s.deletePanel);
  const updatePanel = useEditor((s) => s.updatePanel);
  const riwayat = useVersiGambar(ai.comicId, panel?.id ?? null, panel?.imageUrl ?? null);
  if (!panel || !page) return null;
  const nomor = page.panels.findIndex((p) => p.id === panel.id) + 1;
  const penuh = page.panels.length >= MAX_PANELS_PER_PAGE;
  const btn = "rounded-lg border border-line px-3 py-2 text-xs hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="space-y-4 p-4 text-sm">
      <div>
        <h3 className="font-semibold">Panel {nomor}</h3>
        <p className="mt-1 text-xs text-gray-500">
          {Math.round(panel.w)} x {Math.round(panel.h)} · seret untuk memindah, tarik sudut untuk mengubah ukuran
          {panel.imageUrl && " · klik dua kali untuk mengatur gambar"}
        </p>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-600">Adegan (dipakai untuk membuat gambar)</p>
        <AdeganInput label="Adegan panel" rows={4} value={panel.adegan} onChange={(v) => updatePanel(panel.id, { adegan: v })} className="mt-1" />
      </div>
      <LatarSection key={`latar-${panel.id}`} panelId={panel.id} latar={panel.latar} />
      <FlowSection key={`flow-${panel.id}`} panel={panel} ai={ai} />
      <UnggahGambarSection key={`unggah-${panel.id}`} panelId={panel.id} ada={!!panel.imageUrl} ai={ai} />
      {panel.imageUrl && <StikerSection key={`stiker-${panel.id}`} imageUrl={panel.imageUrl} />}
      {panel.imageUrl && <HapusLatarSection key={`hapus-${panel.id}`} panelId={panel.id} imageUrl={panel.imageUrl} ai={ai} />}
      {panel.imageUrl && <EditAiSection key={panel.id} panelId={panel.id} ai={ai} />}
      {panel.imageUrl && riwayat.versi.length > 0 && <RiwayatGambar riwayat={riwayat} />}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={penuh} onClick={() => split(panel.id, "horizontal")} className={btn}>
          Bagi kiri-kanan
        </button>
        <button type="button" disabled={penuh} onClick={() => split(panel.id, "vertikal")} className={btn}>
          Bagi atas-bawah
        </button>
        <button type="button" disabled={penuh} onClick={() => dup(panel.id)} className={btn}>
          Duplikat
        </button>
        <button type="button" disabled={page.panels.length <= 1} onClick={() => del(panel.id)} className={`${btn} text-danger`}>
          Hapus panel
        </button>
      </div>
    </div>
  );
}

function ElementTab() {
  const el = useEditor(selectSelectedElement);
  const update = useEditor((s) => s.updateElement);
  const del = useEditor((s) => s.deleteElement);
  if (!el) return null;
  if (el.kind === "teks") return <TeksTab el={el} />;
  if (el.kind === "stiker") return <StikerTab el={el} />;
  const angka = (v: string, max: number) => Math.max(1, Math.min(max, Math.floor(Number(v) || 1)));

  return (
    <div className="space-y-4 p-4 text-sm">
      <div>
        <h3 className="font-semibold">Kumpulan benda</h3>
        <p className="mt-1 text-xs text-gray-500">Digambar dari angka, bukan oleh AI, jadi jumlahnya selalu tepat.</p>
      </div>
      <div>
        <span className="font-semibold">Benda</span>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {IKON_BENDA.map((i) => (
            <button
              key={i.id}
              type="button"
              aria-pressed={el.ikon === i.id}
              onClick={() => update(el.id, { ikon: i.id })}
              className={`rounded-lg border px-2 py-2 text-xs ${el.ikon === i.id ? "border-violet-600 bg-violet-600 text-white" : "border-line hover:bg-surface-muted"}`}
            >
              {i.nama}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="jumlah-benda" className="font-semibold">
          Jumlah
        </label>
        <div className="mt-1 flex items-center gap-2">
          <button type="button" aria-label="Kurangi" onClick={() => update(el.id, { jumlah: Math.max(1, el.jumlah - 1) })} className="h-9 w-9 rounded-lg border border-line text-lg hover:bg-surface-muted">
            −
          </button>
          <input
            id="jumlah-benda"
            type="number"
            min={1}
            max={MAX_JUMLAH}
            value={el.jumlah}
            onChange={(e) => update(el.id, { jumlah: angka(e.target.value, MAX_JUMLAH) })}
            className="h-9 w-20 rounded-lg border border-line px-2 text-center"
          />
          <button type="button" aria-label="Tambah" onClick={() => update(el.id, { jumlah: Math.min(MAX_JUMLAH, el.jumlah + 1) })} className="h-9 w-9 rounded-lg border border-line text-lg hover:bg-surface-muted">
            +
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="kolom-benda" className="font-semibold">
          Per baris
        </label>
        <input
          id="kolom-benda"
          type="number"
          min={1}
          max={MAX_KOLOM}
          value={el.kolom}
          onChange={(e) => update(el.id, { kolom: angka(e.target.value, MAX_KOLOM) })}
          className="mt-1 h-9 w-20 rounded-lg border border-line px-2 text-center"
        />
        <p className="mt-1 text-xs text-gray-500">Mis. 10 benda, 5 per baris = 2 baris. Cocok untuk perkalian dan pengelompokan.</p>
      </div>
      <Putaran el={el} />
      <IkatPanel el={el} />
      <button type="button" onClick={() => del(el.id)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-danger hover:bg-surface-muted">
        <Trash2 size={14} /> Hapus elemen
      </button>
    </div>
  );
}

function LayerTab({ ai }: { ai: EditAiProps }) {
  const element = useEditor(selectSelectedElement);
  const panel = useEditor(selectSelectedPanel);
  const bubble = useEditor(selectSelectedBubble);
  const update = useEditor((s) => s.updateBubble);
  const del = useEditor((s) => s.deleteBubble);
  if (element) return <ElementTab />;
  if (panel) return <PanelTab ai={ai} />;
  if (!bubble) return <p className="p-4 text-sm text-gray-500">Pilih panel, balon, atau elemen di kanvas untuk mengubahnya.</p>;

  return (
    <div className="space-y-4 p-4 text-sm">
      <div>
        <span className="font-semibold">Jenis</span>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {(Object.keys(KIND_LABEL) as BubbleKind[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={bubble.kind === k}
              onClick={() =>
                update(bubble.id, {
                  kind: k,
                  bentuk: undefined,
                  tail: k === "narasi" ? null : (bubble.tail ?? { dx: 20, dy: bubble.h / 2 + 40 }),
                })
              }
              className={`rounded-lg border px-2 py-2 text-xs ${bubble.kind === k ? "border-brand bg-brand text-brand-foreground" : "border-line hover:bg-surface-muted"}`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      <PilihBentukBalon bubble={bubble} />

      <div>
        <label htmlFor="teks-balon" className="font-semibold">Teks</label>
        <textarea
          id="teks-balon"
          rows={4}
          maxLength={300}
          value={bubble.text}
          onChange={(e) => update(bubble.id, { text: e.target.value })}
          className="mt-1 w-full rounded border border-line px-2 py-1.5"
        />
        <p className="text-right text-xs text-gray-500">{bubble.text.length} / 300</p>
      </div>

      <div>
        <label htmlFor="ukuran-font" className="font-semibold">Ukuran huruf: {bubble.fontSize}</label>
        <input
          id="ukuran-font"
          type="range"
          min={14}
          max={48}
          value={bubble.fontSize}
          onChange={(e) => update(bubble.id, { fontSize: Number(e.target.value) })}
          className="mt-1 w-full"
        />
      </div>

      {bubble.kind !== "narasi" && (
        <label className="flex items-center justify-between">
          <span className="font-semibold">Ekor balon</span>
          <input
            type="checkbox"
            checked={!!bubble.tail}
            onChange={(e) => update(bubble.id, { tail: e.target.checked ? { dx: 20, dy: bubble.h / 2 + 40 } : null })}
          />
        </label>
      )}

      <button type="button" onClick={() => del(bubble.id)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-danger hover:bg-surface-muted">
        <Trash2 size={14} /> Hapus balon
      </button>
    </div>
  );
}

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
const AUTOSAVE_MS = 800;
const KEEPALIVE_LIMIT = 60_000; // batas body fetch keepalive di browser adalah 64 KB

/** Kirim isi editor ke API. keepalive membuat permintaan tetap terkirim setelah halaman ditinggalkan. */
async function postSave(comicId: string, pages: EditorPage[], keepalive: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const body = JSON.stringify(pages);
  try {
    const res = await fetch(`/api/comics/${comicId}/editor`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body,
      keepalive: keepalive && body.length < KEEPALIVE_LIMIT,
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    return res.ok && json?.ok ? { ok: true } : { ok: false, error: json?.error ?? "Gagal menyimpan" };
  } catch {
    return { ok: false, error: "Tidak ada koneksi" };
  }
}

/** Autosave: simpan setelah perubahan terakhir, satu simpanan berjalan sekaligus, dan peringatan sebelum menutup tab. */
function useAutosave(comicId: string | undefined, ready: boolean) {
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const again = useRef(false);
  const dirty = useRef(false);
  const gagal = useRef(false);

  const flush = useCallback(async (keepalive = false) => {
    if (!comicId) return;
    if (inFlight.current) {
      again.current = true;
      return;
    }
    inFlight.current = true;
    setState("saving");
    dirty.current = false;
    const res = await postSave(comicId, useEditor.getState().pages, keepalive);
    inFlight.current = false;
    gagal.current = !res.ok;
    if (!res.ok) {
      dirty.current = true;
      setError(res.error);
      setState("error");
    } else if (again.current || dirty.current) {
      again.current = false;
      void flush();
      return;
    } else {
      setState("saved");
    }
  }, [comicId]);

  useEffect(() => {
    if (!comicId || !ready) return;
    let last = useEditor.getState().pages;
    const unsub = useEditor.subscribe((s) => {
      if (s.pages === last) return;
      last = s.pages;
      dirty.current = true;
      setState((st) => (st === "saving" ? st : "dirty"));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
    });
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current || inFlight.current) e.preventDefault();
    };
    // simpan segera saat tab disembunyikan atau ditutup
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && dirty.current) void flush(true);
    };
    // pagehide: visibilityState belum tentu "hidden" saat navigasi penuh, jadi simpan tanpa syarat
    const onPageHide = () => {
      if (dirty.current) void flush(true);
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      unsub();
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      if (timer.current) clearTimeout(timer.current);
      // pindah halaman lewat navigasi sisi-klien (mis. tombol Dashboard) tidak memicu beforeunload:
      // simpan perubahan yang masih tertunda sebelum editor dilepas
      if (dirty.current) void flush(true);
    };
  }, [comicId, ready, flush]);

  /** Simpan sekarang dan tunggu sampai server menerima versi terakhir (dipakai sebelum generate gambar). */
  const simpanSekarang = useCallback(async () => {
    if (!comicId) return false;
    if (timer.current) clearTimeout(timer.current);
    dirty.current = true; // selalu kirim versi terkini, termasuk halaman yang belum pernah tersimpan
    const mulai = Date.now();
    while (Date.now() - mulai < 15000) {
      if (inFlight.current) {
        await new Promise((r) => setTimeout(r, 150));
        continue;
      }
      if (!dirty.current) return true;
      await flush();
      if (gagal.current) return false;
    }
    return false;
  }, [comicId, flush]);

  return { state, error, retry: flush, simpanSekarang };
}

export function EditorShell({
  comicId,
  title,
  fontFamily,
  initialPages,
  kredit,
  tokoh = [],
  gaya = null,
  karakter = [],
  terbit = { terbit: false, deskripsi: "" },
  penulis = "Guru KomikEdu",
}: {
  comicId?: string;
  title: string;
  fontFamily: string;
  initialPages: EditorPage[];
  kredit: number;
  tokoh?: Tokoh[];
  gaya?: string | null;
  /** lembar karakter komik (karakter_json) */
  karakter?: { nama: string; deskripsi: string }[];
  /** status komunitas komik (diterbitkan atau belum, dan deskripsi publiknya) */
  terbit?: { terbit: boolean; deskripsi: string };
  /** nama profil yang tampil sebagai penulis di komunitas */
  penulis?: string;
}) {
  const init = useEditor((s) => s.init);
  const page = useEditor((s) => s.pages.find((p) => p.id === s.activePageId));
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);
  const zoom = useEditor((s) => s.zoom);
  const setZoom = useEditor((s) => s.setZoom);
  const selectedId = useEditor((s) => s.selectedId);
  const del = useEditor((s) => s.deleteBubble);
  const [tab, setTab] = useState<"halaman" | "layer" | "tokoh">("halaman");
  const [ready, setReady] = useState(false);
  const save = useAutosave(comicId, ready);
  const [saldo, setSaldo] = useState(kredit);
  const [generatingPage, setGeneratingPage] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [editingPanel, setEditingPanel] = useState<string | null>(null);
  /** tokoh di naskah yang belum ada di daftar: dialog "buat semua tokoh" sebelum membuat gambar halaman */
  const [perluTokoh, setPerluTokoh] = useState<{ pageId: string; nama: string[] } | null>(null);
  const [daftarTokoh, setDaftarTokoh] = useState(tokoh);
  const [sheet, setSheet] = useState(karakter);

  const [melengkapi, setMelengkapi] = useState(false);
  const [pesanLengkapi, setPesanLengkapi] = useState<{ ok: boolean; teks: string } | null>(null);

  async function lengkapiNaskah(pageId: string) {
    if (!comicId) return;
    const pg = useEditor.getState().pages.find((p) => p.id === pageId);
    if (!pg) return;
    setPesanLengkapi(null);
    setMelengkapi(true);
    try {
      // kirim isi editor saat ini (bisa belum tersimpan) sebagai konteks
      const panels = pg.panels.map((p) => ({
        id: p.id,
        adegan: p.adegan,
        dialog: pg.bubbles
          .filter((b) => b.panelId === p.id && b.text.trim())
          .slice(0, 6)
          .map((b) => ({ jenis: b.kind, teks: b.text.slice(0, 300) })),
      }));
      const res = await fetch(`/api/comics/${comicId}/pages/${pageId}/lengkapi`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ panels }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: true; panels: { id: string; adegan: string; dialog: { karakter: string; jenis: "bicara" | "pikir" | "narasi"; teks: string }[] }[]; peringatan: string[] }
        | { ok: false; error: string }
        | null;
      if (res.ok && json?.ok) {
        useEditor.getState().isiPanelKosong(pageId, json.panels);
        setPesanLengkapi({
          ok: json.peringatan.length === 0,
          teks: json.peringatan.length
            ? `${json.panels.length} panel diisi, tapi perlu dicek: ${json.peringatan.join(" ")}`
            : `${json.panels.length} panel diisi. Periksa adegan dan balonnya, lalu buat gambar.`,
        });
      } else {
        setPesanLengkapi({ ok: false, teks: json && !json.ok ? json.error : "Gagal melengkapi naskah. Coba lagi." });
      }
    } catch {
      setPesanLengkapi({ ok: false, teks: "Tidak ada koneksi. Coba lagi." });
    } finally {
      setMelengkapi(false);
    }
  }

  async function editPanelAi(panelId: string, instruksi: string): Promise<string | null> {
    if (!comicId) return "Komik belum tersimpan";
    setEditingPanel(panelId);
    try {
      if (!(await save.simpanSekarang())) return "Gagal menyimpan perubahan editor. Coba lagi.";
      const res = await fetch(`/api/comics/${comicId}/panels/${panelId}/edit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instruksi }),
      });
      const json = (await res.json().catch(() => null)) as { ok: true; imageUrl: string; saldo: number } | { ok: false; error: string } | null;
      if (res.ok && json?.ok) {
        applyPanelImages({ [panelId]: json.imageUrl });
        setSaldo(json.saldo);
        return null;
      }
      return json && !json.ok ? json.error : "Gagal mengubah gambar. Coba lagi.";
    } catch {
      return "Tidak ada koneksi. Coba lagi.";
    } finally {
      setEditingPanel(null);
    }
  }

  async function unggahPanel(panelId: string, file: File, sumber?: "tanpa-latar"): Promise<string | null> {
    if (!comicId) return "Komik belum tersimpan";
    setEditingPanel(panelId);
    try {
      if (!(await save.simpanSekarang())) return "Gagal menyimpan perubahan editor. Coba lagi.";
      const form = new FormData();
      form.set("file", await kecilkanGambar(file));
      if (sumber) form.set("sumber", sumber);
      const res = await fetch(`/api/comics/${comicId}/panels/${panelId}/gambar`, { method: "PUT", body: form });
      const json = (await res.json().catch(() => null)) as { ok: true; imageUrl: string } | { ok: false; error: string } | null;
      if (res.ok && json?.ok) {
        applyPanelImages({ [panelId]: json.imageUrl });
        return null;
      }
      return json && !json.ok ? json.error : "Gagal mengunggah gambar. Coba lagi.";
    } catch {
      return "Tidak ada koneksi. Coba lagi.";
    } finally {
      setEditingPanel(null);
    }
  }

  /**
   * Tombol "Buat gambar halaman". Bila naskah halaman menyebut tokoh yang belum ada di daftar tokoh, tampilkan dialog untuk
   * membuat semuanya dulu; pemeriksaan gagal tidak menghalangi (langsung lanjut). `lewatiTokoh` dipakai dialog untuk melanjutkan.
   */
  async function generateHalaman(pageId: string, lewatiTokoh = false) {
    if (!comicId) return;
    if (!lewatiTokoh) {
      setGenError(null);
      try {
        const res = await fetch(`/api/comics/${comicId}/tokoh/belum?halaman=${pageId}`);
        const json = (await res.json().catch(() => null)) as { ok: true; nama: string[] } | { ok: false } | null;
        if (res.ok && json?.ok && json.nama.length > 0) {
          setPerluTokoh({ pageId, nama: json.nama });
          return;
        }
      } catch {
        // tanpa koneksi atau galat: lanjut, gambar tetap dibuat dan tokohnya ditambahkan otomatis
      }
    }
    setPerluTokoh(null);
    setGenError(null);
    setGeneratingPage(pageId);
    try {
      // server membaca posisi panel dan adegan dari database, jadi simpan dulu versi terakhir
      if (!(await save.simpanSekarang())) {
        setGenError("Gagal menyimpan perubahan editor. Coba lagi.");
        return;
      }
      const res = await fetch(`/api/comics/${comicId}/pages/${pageId}/generate`, { method: "POST" });
      const json = (await res.json().catch(() => null)) as
        | { ok: true; panels: { id: string; imageUrl: string }[]; saldo: number; tokoh: Tokoh[]; karakter: { nama: string; deskripsi: string }[] }
        | { ok: false; error: string }
        | null;
      if (res.ok && json?.ok) {
        applyPanelImages(Object.fromEntries(json.panels.map((p) => [p.id, p.imageUrl])));
        setSaldo(json.saldo);
        setDaftarTokoh(json.tokoh);
        setSheet(json.karakter);
      } else {
        setGenError(json && !json.ok ? json.error : "Gagal membuat gambar. Coba lagi.");
      }
    } catch {
      setGenError("Tidak ada koneksi. Coba lagi.");
    } finally {
      setGeneratingPage(null);
    }
  }

  // berkas gambar yang terlepas di luar kanvas (mis. di sidebar) tidak boleh membuat browser membukanya dan meninggalkan editor
  useEffect(() => {
    const cegah = (e: DragEvent) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", cegah);
    window.addEventListener("drop", cegah);
    return () => {
      window.removeEventListener("dragover", cegah);
      window.removeEventListener("drop", cegah);
    };
  }, []);

  // Ctrl/Cmd + scroll (dan cubit trackpad) di area kanvas memperbesar kanvas, bukan seluruh halaman browser.
  // Dipasang di window dengan passive: false karena React mendaftarkan onWheel sebagai pasif.
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !mainRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
      const st = useEditor.getState();
      st.setZoom(Math.round(st.zoom * Math.exp(-e.deltaY * 0.002) * 100) / 100);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  // akses store dari konsol browser untuk debugging (hanya development)
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") (window as unknown as { __editor?: typeof useEditor }).__editor = useEditor;
  }, []);

  useEffect(() => {
    init(initialPages);
    clearHistory();
    setReady(true);
  }, [init, initialPages]);

  // seperti Anifusion: tab Layer muncul saat ada yang dipilih
  useEffect(() => {
    setTab(selectedId ? "layer" : "halaman");
  }, [selectedId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable]")) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        const st = useEditor.getState();
        const isPanel = st.pages.some((p) => p.id === st.activePageId && p.panels.some((x) => x.id === selectedId));
        if (isPanel && st.selectedLayer === "gambar") return; // gambar dibuat server, tidak dihapus dari sini
        if (isPanel) st.deletePanel(selectedId);
        else if (st.pages.some((p) => p.id === st.activePageId && p.elements.some((x) => x.id === selectedId))) st.deleteElement(selectedId);
        else del(selectedId);
      } else if (e.key === "Escape") {
        setTool("move");
        const st = useEditor.getState();
        st.setCornerEdit(null);
        // keluar dari mode gambar kembali ke panelnya
        if (st.selectedLayer === "gambar" && st.selectedId) st.select(st.selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, del, setTool]);

  if (!ready || !page) return <div className="grid h-screen place-items-center text-sm text-gray-500">Memuat editor...</div>;

  return (
    <div className="flex h-screen overflow-hidden bg-canvas text-foreground">
      <aside className="flex w-72 shrink-0 flex-col border-r border-line bg-surface">
        <div className="flex flex-col gap-2.5 border-b border-line p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="text-xs text-gray-500">{saldo} kredit</p>
            {comicId ? (
              <p role="status" className={`text-xs ${save.state === "error" ? "text-danger" : "text-gray-500"}`}>
                {save.state === "dirty" && "Perubahan belum disimpan..."}
                {save.state === "saving" && "Menyimpan..."}
                {save.state === "saved" && "Tersimpan"}
                {save.state === "error" && (
                  <>
                    {save.error}.{" "}
                    <button type="button" onClick={() => void save.retry()} className="underline">
                      Coba lagi
                    </button>
                  </>
                )}
              </p>
            ) : (
              <p className="text-xs text-gray-500">Pratinjau, tidak disimpan</p>
            )}
          </div>
          {/* tombol di bawah judul agar judul tidak terpotong; galat ekspor muncul tepat di bawah barisnya */}
          <div className="relative flex items-stretch gap-1.5">
            <TombolTerbit comicId={comicId} awal={terbit} penulis={penulis} fontFamily={fontFamily} simpanDulu={save.simpanSekarang} />
            <TombolEkspor judul={title} fontFamily={fontFamily} />
          </div>
        </div>
        <PagesPanel />
        <LayersPanel />
      </aside>

      <main ref={mainRef} className="relative min-w-0 flex-1">
        <Link href="/dashboard" className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-surface px-4 py-1.5 text-sm shadow">
          <Home size={14} /> Dashboard
        </Link>
        <EditorCanvas fontFamily={fontFamily} generating={generatingPage === page.id} comicId={comicId} onLepasGambar={comicId ? unggahPanel : undefined} />

        <div role="toolbar" aria-label="Alat" className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-xl bg-surface p-1.5 shadow-lg">
          <ToolButton label="Pilih" active={tool === "move"} onClick={() => setTool("move")}>
            <MousePointer2 size={18} />
          </ToolButton>
          <ToolButton label="Teks" active={tool === "text"} onClick={() => setTool("text")}>
            <Type size={18} />
          </ToolButton>
          <ToolButton label="Elemen Mat" active={tool === "mat"} onClick={() => setTool("mat")}>
            <Apple size={18} />
          </ToolButton>
          <ToolButton label="Teks gaya" active={tool === "teksgaya"} onClick={() => setTool("teksgaya")}>
            <Zap size={18} />
          </ToolButton>
          <span className="mx-1 h-8 w-px bg-line" />
          <ToolButton label="Undo" onClick={undo}>
            <Undo2 size={18} />
          </ToolButton>
          <ToolButton label="Redo" onClick={redo}>
            <Redo2 size={18} />
          </ToolButton>
        </div>
        {tool !== "move" && (
          <p role="status" className="absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/80 px-3 py-1 text-xs text-white">
            {tool === "text" ? "Klik di dalam panel untuk menaruh balon." : tool === "teksgaya" ? "Klik di dalam panel untuk menaruh teks bergaya (judul atau efek suara)." : "Klik di dalam panel untuk menaruh kumpulan benda (jumlah pasti)."} Esc untuk batal.
          </p>
        )}

        <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 rounded-xl bg-surface p-1.5 text-xs shadow-lg">
          <button type="button" aria-label="Perkecil" onClick={() => setZoom(zoom - 0.1)} className="rounded p-1.5 hover:bg-surface-muted">
            <ZoomOut size={16} />
          </button>
          <button type="button" onClick={() => setZoom(1)} className="w-12 rounded p-1 text-center hover:bg-surface-muted" title="Atur ulang zoom">
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" aria-label="Perbesar" onClick={() => setZoom(zoom + 0.1)} className="rounded p-1.5 hover:bg-surface-muted">
            <ZoomIn size={16} />
          </button>
        </div>
      </main>

      <aside className="flex w-80 shrink-0 flex-col border-l border-line bg-surface">
        <div role="tablist" aria-label="Pengaturan" className="m-3 grid grid-cols-3 gap-1 rounded-lg bg-surface-muted p-1 text-sm">
          {(["halaman", "layer", "tokoh"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 font-medium ${tab === t ? "bg-surface shadow-sm" : "text-gray-500"}`}
            >
              {t === "halaman" ? "Halaman" : t === "layer" ? "Layer" : "Tokoh"}
            </button>
          ))}
        </div>
        {/* daftar nama tokoh untuk saran "@" di kolom adegan */}
        <NamaTokohContext.Provider value={daftarTokoh.map((t) => t.nama)}>
        <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto">
          {tab === "halaman" ? (
            <PageTab
              page={page}
              gen={{
                tersimpan: !!comicId,
                saldo,
                generating: generatingPage !== null || editingPanel !== null,
                error: genError,
                onGenerate: () => void generateHalaman(page.id),
                melengkapi,
                pesanLengkapi,
                onLengkapi: () => void lengkapiNaskah(page.id),
              }}
            />
          ) : tab === "tokoh" ? (
            <TokohTab comicId={comicId} gaya={gaya} tokoh={daftarTokoh} setTokoh={setDaftarTokoh} sheet={sheet} saldo={saldo} setSaldo={setSaldo} />
          ) : (
            <LayerTab
              ai={{
                tersimpan: !!comicId,
                saldo,
                sibuk: editingPanel ?? generatingPage,
                onEdit: editPanelAi,
                onUnggah: unggahPanel,
                comicId,
                tokoh: daftarTokoh,
                gaya,
              }}
            />
          )}
        </div>
        </NamaTokohContext.Provider>
      </aside>
      {perluTokoh && comicId && (
        <DialogTokohNaskah
          key={perluTokoh.pageId}
          comicId={comicId}
          nama={perluTokoh.nama}
          saldo={saldo}
          setSaldo={setSaldo}
          setTokoh={setDaftarTokoh}
          setSheet={setSheet}
          onLanjut={() => void generateHalaman(perluTokoh.pageId, true)}
          onBatal={() => setPerluTokoh(null)}
        />
      )}
    </div>
  );
}
