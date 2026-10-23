"use client";

import { createContext, useContext, useLayoutEffect, useRef, useState } from "react";
import { cariMention, pecahNama, saringNama, sisipkanMention } from "@/lib/editor/mention";

/** Nama tokoh komik untuk saran "@" di kolom adegan; diisi EditorShell dari daftar tokoh. */
export const NamaTokohContext = createContext<string[]>([]);

/** Kolom adegan dengan saran tokoh: ketik "@" untuk memilih nama tokoh. */
export function AdeganInput({
  value,
  onChange,
  rows = 3,
  label,
  className = "",
  peringatan = false,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  label: string;
  /** margin dan tata letak di luar kolom; border dan padding kolom sengaja tidak bisa diubah agar sejajar dengan penanda */
  className?: string;
  /** border kuning, mis. adegan masih kosong */
  peringatan?: boolean;
}) {
  const nama = useContext(NamaTokohContext);
  const ref = useRef<HTMLTextAreaElement>(null);
  const [mention, setMention] = useState<{ awal: number; query: string } | null>(null);
  const [aktif, setAktif] = useState(0);
  const saran = mention ? saringNama(nama, mention.query) : [];
  // "@Jo lalu" tanpa nama yang cocok berarti guru sudah menulis kalimat biasa: tutup saran
  const terbuka = mention !== null && (saran.length > 0 || !mention.query.includes(" "));

  const perbarui = (el: HTMLTextAreaElement) => {
    const m = cariMention(el.value, el.selectionStart);
    setMention(m);
    if (!m || m.query !== mention?.query) setAktif(0);
  };

  function pilih(n: string) {
    const el = ref.current;
    if (!el || !mention) return;
    const hasil = sisipkanMention(value, mention.awal, el.selectionStart, n);
    onChange(hasil.teks);
    setMention(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(hasil.kursor, hasil.kursor);
    });
  }

  // textarea tumbuh mengikuti isi (tanpa scroll), supaya lapisan penanda di belakangnya selalu sejajar
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);

  return (
    <div className={`relative ${className}`}>
      {/*
        Lapisan penanda nama tokoh: salinan teks dengan font, padding, dan lebar yang sama persis dengan textarea di atasnya.
        Teksnya transparan; hanya latar penanda yang terlihat. Penanda tidak boleh mengubah lebar teks (tanpa tebal atau padding),
        kalau tidak, baris akan bergeser dari teks asli.
      */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words rounded border border-transparent px-2 py-1.5 text-xs text-transparent`}
      >
        {pecahNama(value, nama).map((p, i) =>
          p.tokoh ? (
            <mark key={i} className="rounded bg-brand/20 text-transparent outline outline-2 outline-brand/20">
              {p.teks}
            </mark>
          ) : (
            <span key={i}>{p.teks}</span>
          ),
        )}
        {"\n"}
      </div>
      <textarea
        ref={ref}
        aria-label={label}
        aria-expanded={terbuka}
        aria-autocomplete="list"
        rows={rows}
        maxLength={1000}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          perbarui(e.target);
        }}
        onKeyUp={(e) => {
          if (!["ArrowUp", "ArrowDown", "Enter", "Tab", "Escape"].includes(e.key)) perbarui(e.currentTarget);
        }}
        onClick={(e) => perbarui(e.currentTarget)}
        onBlur={() => setTimeout(() => setMention(null), 150)}
        onKeyDown={(e) => {
          if (!terbuka) return;
          if (e.key === "Escape") {
            e.preventDefault();
            setMention(null);
          } else if (saran.length && e.key === "ArrowDown") {
            e.preventDefault();
            setAktif((a) => (a + 1) % saran.length);
          } else if (saran.length && e.key === "ArrowUp") {
            e.preventDefault();
            setAktif((a) => (a - 1 + saran.length) % saran.length);
          } else if (saran.length && (e.key === "Enter" || e.key === "Tab")) {
            e.preventDefault();
            pilih(saran[Math.min(aktif, saran.length - 1)]);
          }
        }}
        placeholder="Gambarkan adegannya tanpa teks. Ketik @ untuk menyebut tokoh."
        className={`relative block w-full resize-none overflow-hidden rounded border bg-transparent px-2 py-1.5 text-xs ${peringatan ? "border-amber-300" : "border-line"}`}
      />
      {terbuka && (
        <ul role="listbox" aria-label="Pilih tokoh" className="absolute left-0 right-0 z-20 mt-1 rounded-lg border border-line bg-surface py-1 text-xs shadow-lg">
          {saran.length ? (
            saran.map((n, i) => (
              <li key={n} role="option" aria-selected={i === aktif}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pilih(n)}
                  className={`block w-full px-3 py-1.5 text-left ${i === aktif ? "bg-brand text-white" : "hover:bg-surface-muted"}`}
                >
                  {n}
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-1.5 text-gray-500">{nama.length ? "Tidak ada tokoh dengan nama itu." : "Belum ada tokoh. Tambahkan di tab Tokoh."}</li>
          )}
        </ul>
      )}
    </div>
  );
}
