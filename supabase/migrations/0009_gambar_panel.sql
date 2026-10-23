-- Generate gambar halaman: adegan bisa diedit di editor, lembar karakter per komik,
-- bucket gambar panel, dan kolom gambar/status panel hanya boleh diubah server.

alter table public.panels
  add column adegan text check (adegan is null or char_length(adegan) <= 1000);

alter table public.comics
  add column karakter_json jsonb,
  add column ref_halaman_url text;

-- image_url dan status panel ditulis server (service role) setelah gambar dibuat.
-- Tanpa ini klien bisa mengisi URL gambar sembarang yang lalu tampil ke siswa.
revoke insert, update on public.panels from authenticated;
grant insert (id, page_id, urutan, posisi, tampil, adegan, script_json) on public.panels to authenticated;
grant update (id, page_id, urutan, posisi, tampil, adegan) on public.panels to authenticated;

-- bucket publik untuk gambar panel (path tak tertebak); hanya server yang menulis
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('panels', 'panels', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
