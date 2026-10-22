"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Eye,
  EyeOff,
  Hand,
  Home,
  MousePointer2,
  Plus,
  Redo2,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { LAYOUTS } from "@/lib/ai/layouts";
import { clearHistory, redo, selectSelectedBubble, undo, useEditor } from "@/lib/editor/store";
import type { BubbleKind, EditorPage } from "@/lib/editor/types";

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

function PagesPanel() {
  const pages = useEditor((s) => s.pages);
  const activeId = useEditor((s) => s.activePageId);
  const setActive = useEditor((s) => s.setActivePage);
  const addPage = useEditor((s) => s.addPage);
  const [picking, setPicking] = useState(false);

  return (
    <section aria-label="Halaman" className="border-b border-line p-3">
      <div className="flex items-center justify-between text-sm">
        <h2 className="font-semibold">Halaman</h2>
        <span className="text-xs text-gray-500">
          {pages.findIndex((p) => p.id === activeId) + 1} dari {pages.length}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {pages.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActive(p.id)}
            aria-current={p.id === activeId}
            className={`grid h-24 w-[72px] place-items-center rounded border text-sm ${p.id === activeId ? "border-brand ring-2 ring-brand/30" : "border-line"}`}
          >
            {i + 1}
          </button>
        ))}
        <div className="relative">
          <button
            type="button"
            onClick={() => setPicking((v) => !v)}
            aria-expanded={picking}
            className="grid h-24 w-[72px] place-items-center rounded border border-dashed border-line text-xs text-gray-500 hover:bg-surface-muted"
          >
            <span className="flex flex-col items-center">
              <Plus size={16} />
              Tambah
            </span>
          </button>
          {picking && (
            <div role="menu" className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-line bg-surface p-2 shadow-lg">
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
            <div className="flex items-center gap-1 px-1 py-1 text-sm font-medium">
              <ChevronDown size={14} /> Panel {i + 1}
            </div>
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
              <li className="px-2 py-1 text-xs text-gray-500">{panel.imageUrl ? "Gambar" : "Gambar: belum dibuat"}</li>
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PageTab({ page }: { page: EditorPage }) {
  return (
    <div className="space-y-4 p-4 text-sm">
      <div>
        <h3 className="font-semibold">Naskah halaman</h3>
        <p className="mt-1 text-xs text-gray-500">Dari naskah yang sudah disetujui. Gambar dibuat dari adegan ini.</p>
        <ol className="mt-2 space-y-2">
          {page.panels.map((p, i) => (
            <li key={p.id} className="rounded border border-line p-2">
              <p className="text-xs font-semibold">Panel {i + 1}</p>
              <p className="mt-0.5 text-xs text-gray-600">{p.adegan || "Belum ada adegan."}</p>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <h3 className="font-semibold">Gambar halaman</h3>
        <p className="mt-1 text-xs text-gray-500">Satu gambar per halaman, lalu dipotong per panel. 1 kredit per halaman.</p>
        <button type="button" disabled className="mt-2 w-full rounded-lg bg-brand px-4 py-2 font-medium text-brand-foreground opacity-50">
          Generate halaman (segera hadir)
        </button>
      </div>
    </div>
  );
}

function LayerTab() {
  const bubble = useEditor(selectSelectedBubble);
  const update = useEditor((s) => s.updateBubble);
  const del = useEditor((s) => s.deleteBubble);
  if (!bubble) return <p className="p-4 text-sm text-gray-500">Pilih balon di kanvas untuk mengubahnya.</p>;

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

  return { state, error, retry: flush };
}

export function EditorShell({ comicId, title, fontFamily, initialPages, kredit }: { comicId?: string; title: string; fontFamily: string; initialPages: EditorPage[]; kredit: number }) {
  const init = useEditor((s) => s.init);
  const page = useEditor((s) => s.pages.find((p) => p.id === s.activePageId));
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);
  const zoom = useEditor((s) => s.zoom);
  const setZoom = useEditor((s) => s.setZoom);
  const selectedId = useEditor((s) => s.selectedId);
  const del = useEditor((s) => s.deleteBubble);
  const [tab, setTab] = useState<"halaman" | "layer">("halaman");
  const [ready, setReady] = useState(false);
  const save = useAutosave(comicId, ready);

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
        del(selectedId);
      } else if (e.key === "Escape") {
        setTool("move");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, del, setTool]);

  if (!ready || !page) return <div className="grid h-screen place-items-center text-sm text-gray-500">Memuat editor...</div>;

  return (
    <div className="flex h-screen overflow-hidden bg-canvas text-foreground">
      <aside className="flex w-72 shrink-0 flex-col border-r border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="text-xs text-gray-500">{kredit} kredit</p>
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
          <button type="button" disabled title="Ekspor PDF segera hadir" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground opacity-50">
            Ekspor
          </button>
        </div>
        <PagesPanel />
        <LayersPanel />
      </aside>

      <main className="relative min-w-0 flex-1">
        <Link href="/dashboard" className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-surface px-4 py-1.5 text-sm shadow">
          <Home size={14} /> Dashboard
        </Link>
        <EditorCanvas fontFamily={fontFamily} />

        <div role="toolbar" aria-label="Alat" className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-xl bg-surface p-1.5 shadow-lg">
          <ToolButton label="Pilih" active={tool === "move"} onClick={() => setTool("move")}>
            <MousePointer2 size={18} />
          </ToolButton>
          <ToolButton label="Teks" active={tool === "text"} onClick={() => setTool("text")}>
            <Type size={18} />
          </ToolButton>
          <ToolButton label="Elemen Mat" disabled>
            <Hand size={18} />
          </ToolButton>
          <span className="mx-1 h-8 w-px bg-line" />
          <ToolButton label="Undo" onClick={undo}>
            <Undo2 size={18} />
          </ToolButton>
          <ToolButton label="Redo" onClick={redo}>
            <Redo2 size={18} />
          </ToolButton>
        </div>
        {tool === "text" && (
          <p role="status" className="absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/80 px-3 py-1 text-xs text-white">
            Klik di dalam panel untuk menaruh balon. Esc untuk batal.
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
        <div role="tablist" aria-label="Pengaturan" className="m-3 grid grid-cols-2 gap-1 rounded-lg bg-surface-muted p-1 text-sm">
          {(["halaman", "layer"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 font-medium ${tab === t ? "bg-surface shadow-sm" : "text-gray-500"}`}
            >
              {t === "halaman" ? "Halaman" : "Layer"}
            </button>
          ))}
        </div>
        <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto">
          {tab === "halaman" ? <PageTab page={page} /> : <LayerTab />}
        </div>
      </aside>
    </div>
  );
}
