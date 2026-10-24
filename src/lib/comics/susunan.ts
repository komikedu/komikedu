export type PratinjauProps = {
  /** jumlah halaman isi; null = otomatis (AI memilih 4 sampai 12 sesuai cerita) */
  jumlahHalaman: number | null;
  /** panel per halaman; null = otomatis */
  panelPerHalaman: number | null;
  /** batas atas rentang panel (panelPerHalaman = batas bawah); null = jumlah tetap atau otomatis */
  panelMaks?: number | null;
  sampul: boolean;
  lebar: number;
  tinggi: number;
};

/** Ringkasan satu kalimat susunan komik, dipakai di bawah pratinjau dan untuk pembaca layar. */
export function ringkasSusunan(p: PratinjauProps): string {
  const halaman = p.jumlahHalaman === null ? "4 sampai 12 halaman (AI menyesuaikan dengan ceritamu)" : `${p.jumlahHalaman} halaman`;
  const panel = p.panelPerHalaman !== null && p.panelMaks != null && p.panelMaks > p.panelPerHalaman ? `${p.panelPerHalaman} sampai ${p.panelMaks} panel per halaman` : p.panelPerHalaman === null ? "2 sampai 4 panel per halaman" : p.panelPerHalaman === 1 ? "1 panel penuh per halaman" : `${p.panelPerHalaman} panel per halaman`;
  return `${p.sampul ? "Sampul + " : ""}${halaman} · ${panel} · halaman ${p.lebar} x ${p.tinggi}`;
}
