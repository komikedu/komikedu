-- Pilihan guru di wizard: jumlah panel per halaman (1 sampai 6). Kosong (null) = otomatis, AI memilih 2 sampai 4
-- sesuai isi halaman. Dibaca saat membuat naskah.

alter table public.comics
  add column panel_per_halaman smallint check (panel_per_halaman is null or panel_per_halaman between 1 and 6);

grant update (panel_per_halaman) on public.comics to authenticated;
