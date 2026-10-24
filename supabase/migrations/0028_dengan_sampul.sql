-- Pilihan guru di wizard: komik memakai halaman sampul atau tidak. Bila ya, naskah menambah halaman sampul di awal
-- (satu ilustrasi poster dengan ruang untuk judul) dan prompt gambarnya menyesuaikan.

alter table public.comics add column if not exists dengan_sampul boolean not null default false;

grant update (dengan_sampul) on public.comics to authenticated;
