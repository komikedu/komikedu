-- Riwayat versi gambar panel: tiap gambar yang pernah dipakai di sebuah panel (hasil generate, edit AI, salinan)
-- dicatat, supaya guru bisa kembali ke versi sebelumnya setelah membuat ulang gambar.
-- Hanya server (service role) yang menulis; pemilik komik boleh membaca.

create table public.panel_images (
  id uuid primary key default gen_random_uuid(),
  panel_id uuid not null references public.panels on delete cascade,
  image_url text not null,
  sumber text not null default 'halaman' check (sumber in ('halaman', 'edit', 'salinan')),
  created_at timestamptz not null default now()
);

create index panel_images_panel_idx on public.panel_images (panel_id, created_at);

alter table public.panel_images enable row level security;
revoke all on public.panel_images from anon, authenticated;
grant select on public.panel_images to authenticated;

create policy panel_images_owner_select on public.panel_images for select
  using (exists (
    select 1 from public.panels pn
    join public.pages p on p.id = pn.page_id
    join public.comics c on c.id = p.comic_id
    where pn.id = panel_id and c.user_id = auth.uid()
  ));

-- gambar yang sudah dipakai sekarang menjadi versi pertama
insert into public.panel_images (panel_id, image_url)
select id, image_url from public.panels where image_url is not null;
