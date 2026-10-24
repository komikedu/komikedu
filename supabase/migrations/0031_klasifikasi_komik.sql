-- Pengelompokan komik di galeri komunitas: tema dan bahasa (jenjang sudah ada). Diisi pemilik saat menerbitkan, lewat
-- server (service role), jadi tidak ada grant tulis untuk klien. Komik yang sudah terbit: tema kosong, bahasa Indonesia.
alter table public.comics
  add column if not exists tema text,
  add column if not exists bahasa text not null default 'indonesia';

alter table public.comics drop constraint if exists comics_tema_check;
alter table public.comics add constraint comics_tema_check
  check (tema is null or tema in ('bilangan', 'pecahan', 'geometri', 'pengukuran', 'waktu', 'data', 'cerita-soal', 'lainnya'));

alter table public.comics drop constraint if exists comics_bahasa_check;
alter table public.comics add constraint comics_bahasa_check check (bahasa in ('indonesia', 'inggris', 'daerah'));

create index if not exists comics_komunitas_filter_idx on public.comics (jenjang, tema, bahasa) where is_public and status = 'terbit';

grant select (tema, bahasa) on public.comics to authenticated;
