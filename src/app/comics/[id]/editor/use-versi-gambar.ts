"use client";

import { useCallback, useEffect, useState } from "react";
import { applyPanelImages } from "@/lib/editor/store";

export type Versi = { id: string; url: string; sumber: "halaman" | "edit" | "salinan" | "unggah"; dibuat: string };

/**
 * Riwayat versi gambar sebuah panel. Daftar dimuat ulang tiap gambar panel berubah (hasil generate, edit AI,
 * atau pindah versi), sehingga selalu cocok dengan gambar yang tampil. `index` -1 bila gambar saat ini tidak ada di riwayat.
 */
export function useVersiGambar(comicId: string | undefined, panelId: string | null, imageUrl: string | null) {
  const [versi, setVersi] = useState<Versi[]>([]);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    if (!comicId || !panelId || !imageUrl) {
      setVersi([]);
      return;
    }
    let batal = false;
    fetch(`/api/comics/${comicId}/panels/${panelId}/versi`)
      .then((r) => r.json())
      .then((j: { ok: boolean; versi?: Versi[] }) => {
        if (!batal && j.ok && j.versi) setVersi(j.versi);
      })
      .catch(() => {});
    return () => {
      batal = true;
    };
  }, [comicId, panelId, imageUrl]);

  const index = versi.findIndex((v) => v.url === imageUrl);

  /** Jadikan sebuah versi sebagai gambar panel saat ini (tanpa kredit). */
  const pasang = useCallback(
    async (target: Versi) => {
      if (!comicId || !panelId || target.url === imageUrl) return;
      setSibuk(true);
      setGalat(null);
      try {
        const res = await fetch(`/api/comics/${comicId}/panels/${panelId}/versi`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ versiId: target.id }),
        });
        const json = (await res.json().catch(() => null)) as { ok: true; url: string } | { ok: false; error: string } | null;
        if (res.ok && json?.ok) applyPanelImages({ [panelId]: json.url });
        else setGalat(json && !json.ok ? json.error : "Gagal mengganti gambar");
      } catch {
        setGalat("Tidak ada koneksi");
      } finally {
        setSibuk(false);
      }
    },
    [comicId, panelId, imageUrl],
  );

  /** Pindah ke versi sebelumnya (-1) atau berikutnya (+1). */
  const pindah = useCallback(
    async (arah: -1 | 1) => {
      const target = versi[index + arah];
      if (index >= 0 && target) await pasang(target);
    },
    [versi, index, pasang],
  );

  return { versi, index, pindah, pasang, sibuk, galat };
}
