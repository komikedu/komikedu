-- Rentang panel per halaman (mis. 2 sampai 6). panel_per_halaman menjadi batas bawah dan panel_per_halaman_maks batas atas;
-- kosong = jumlah tetap (panel_per_halaman) atau otomatis (keduanya kosong). AI memilih jumlah panel tiap halaman dalam rentang itu.

alter table public.comics
  add column if not exists panel_per_halaman_maks smallint check (panel_per_halaman_maks is null or panel_per_halaman_maks between 2 and 6);

grant update (panel_per_halaman_maks) on public.comics to authenticated;
