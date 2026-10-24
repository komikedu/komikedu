-- Pilihan guru di wizard: jumlah halaman otomatis. Bila true, AI menentukan sendiri jumlah halaman (4 sampai 12) sesuai
-- panjang cerita atau materi, dan jumlah_halaman hanya dipakai sebagai nilai cadangan.

alter table public.comics add column if not exists halaman_otomatis boolean not null default false;

grant update (halaman_otomatis) on public.comics to authenticated;
