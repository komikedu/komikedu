-- Wizard pembuatan komik: kolom draft di comics + bucket privat untuk PDF materi.

alter table public.comics
  add column topik text,
  add column jumlah_halaman smallint not null default 8 check (jumlah_halaman between 4 and 12),
  add column wizard_step smallint not null default 1 check (wizard_step between 1 and 3);

alter table public.comics alter column jenjang set default 5;
alter table public.comics alter column judul set default 'Komik tanpa judul';
alter table public.comics
  add constraint comics_gaya_check check (gaya is null or gaya in ('kartun-cerah', 'anime-lembut', 'buku-cerita'));

-- satu materi per komik
alter table public.source_materials add constraint source_materials_comic_unique unique (comic_id);

-- bucket privat: hanya PDF, maks 20 MB, folder pertama = id pemilik
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materials', 'materials', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

create policy materials_owner_all on storage.objects
  for all to authenticated
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
