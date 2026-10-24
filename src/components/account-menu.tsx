"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Coins, LogOut, UserRound } from "lucide-react";

export function AccountMenu({ email, nama, saldo }: { email: string; nama: string; saldo: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const inisial = (nama || email).trim().charAt(0).toUpperCase() || "?";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm hover:bg-surface-muted"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-sm font-semibold text-brand-foreground">{inisial}</span>
        <span className="hidden sm:inline">Akun</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-line bg-surface p-1 shadow-lg">
          <div className="border-b border-line px-3 py-2.5">
            <p className="truncate text-sm font-medium">{nama || email}</p>
            {nama && <p className="truncate text-xs text-gray-500">{email}</p>}
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-600">
              <Coins size={13} className="text-amber-600" /> {saldo} kredit tersisa
            </p>
          </div>
          <Link href="/profil" role="menuitem" onClick={() => setOpen(false)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-muted">
            <UserRound size={14} /> Edit profil
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled
            title="Pembelian kredit segera hadir"
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-gray-400"
          >
            Beli kredit <span className="text-xs">segera</span>
          </button>
          <form action="/auth/signout" method="post">
            <button type="submit" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-muted">
              <LogOut size={14} /> Keluar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
