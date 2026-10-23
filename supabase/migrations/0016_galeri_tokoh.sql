-- Galeri gambar tokoh: semua potret dan badan penuh yang pernah dibuat atau diunggah untuk sebuah tokoh dicatat,
-- supaya gambar lama bisa dipasang lagi. Tidak ada yang dibuang sampai komiknya dihapus.
-- Hanya server (service role) yang menulis; pemilik komik boleh membaca.

create table public.tokoh_images (
  id uuid primary key default gen_random_uuid(),
  comic_id uuid not null references public.comics on delete cascade,
  tokoh_id text not null,
  jenis text not null check (jenis in ('potret', 'badan')),
  image_url text not null,
  sumber text not null default 'ai' check (sumber in ('ai', 'unggah')),
  created_at timestamptz not null default now()
);

create index tokoh_images_idx on public.tokoh_images (comic_id, tokoh_id, jenis, created_at);

alter table public.tokoh_images enable row level security;
revoke all on public.tokoh_images from anon, authenticated;
grant select on public.tokoh_images to authenticated;

create policy tokoh_images_owner_select on public.tokoh_images for select
  using (exists (select 1 from public.comics c where c.id = comic_id and c.user_id = auth.uid()));

-- potret dan badan penuh yang sedang dipakai menjadi isi awal galeri
insert into public.tokoh_images (comic_id, tokoh_id, jenis, image_url)
select c.id, t->>'id', j.jenis, t->>j.jenis
from public.comics c,
     jsonb_array_elements(c.tokoh_json) t,
     (values ('potret'), ('badan')) as j(jenis)
where t->>j.jenis is not null;
