import { create } from "zustand";

/** Keterangan proses yang sedang berjalan di sebuah panel (mis. mengunggah gambar). `persen` null = lamanya tidak diketahui. */
export type StatusPanel = { teks: string; persen: number | null };

type State = {
  perPanel: Record<string, StatusPanel>;
  atur: (panelId: string, status: StatusPanel) => void;
  hapus: (panelId: string) => void;
};

/** Di luar riwayat undo: hanya keadaan tampilan sementara, tidak ikut tersimpan. */
export const useStatusPanel = create<State>((set) => ({
  perPanel: {},
  atur: (panelId, status) => set((s) => ({ perPanel: { ...s.perPanel, [panelId]: status } })),
  hapus: (panelId) =>
    set((s) => {
      if (!(panelId in s.perPanel)) return s;
      const { [panelId]: _dibuang, ...sisa } = s.perPanel;
      void _dibuang;
      return { perPanel: sisa };
    }),
}));
