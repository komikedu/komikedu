-- Ukuran kanvas halaman per komik (unit editor). Bawaan 900 x 1200 (vertikal 3:4), sama dengan komik yang sudah ada.
alter table public.comics
  add column if not exists lebar_halaman integer not null default 900,
  add column if not exists tinggi_halaman integer not null default 1200;

alter table public.comics drop constraint if exists comics_ukuran_halaman_wajar;
alter table public.comics add constraint comics_ukuran_halaman_wajar check (
  lebar_halaman between 400 and 3000
  and tinggi_halaman between 400 and 3000
  and lebar_halaman <= tinggi_halaman * 3
  and tinggi_halaman <= lebar_halaman * 3
);

grant select (lebar_halaman, tinggi_halaman) on public.comics to authenticated;
grant update (lebar_halaman, tinggi_halaman) on public.comics to authenticated;
