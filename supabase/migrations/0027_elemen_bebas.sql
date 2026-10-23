-- Elemen di atas halaman yang tidak terikat panel (teks bergaya, kumpulan benda bebas) disimpan per halaman.
alter table public.pages add column if not exists elemen_bebas jsonb not null default '[]'::jsonb;

grant select (elemen_bebas) on public.pages to authenticated;
grant insert (elemen_bebas) on public.pages to authenticated;
grant update (elemen_bebas) on public.pages to authenticated;
