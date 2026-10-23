-- Komunitas: guru bisa menerbitkan komik agar dibaca publik tanpa login, dan menarik kembali kapan saja.
-- (Diterapkan ke database dengan nama 0017a_komunitas_tambahan. Pembuangan kebijakan baca publik ada di 0018.)

alter table public.comics
  add column diterbitkan_at timestamptz,
  add column deskripsi_publik text check (deskripsi_publik is null or char_length(deskripsi_publik) <= 300);

create index comics_terbit_idx on public.comics (diterbitkan_at desc) where is_public and status = 'terbit';

-- laporan dari pembaca: hanya server yang membaca dan menulis; satu laporan per pelapor per komik
create table public.comic_reports (
  id uuid primary key default gen_random_uuid(),
  comic_id uuid not null references public.comics on delete cascade,
  pelapor_id uuid references public.users on delete set null,
  alasan text not null check (alasan in ('tidak-pantas', 'hak-cipta', 'salah', 'spam', 'lainnya')),
  catatan text check (catatan is null or char_length(catatan) <= 500),
  status text not null default 'baru' check (status in ('baru', 'selesai')),
  created_at timestamptz not null default now(),
  unique (comic_id, pelapor_id)
);

create index comic_reports_status_idx on public.comic_reports (status, created_at desc);

alter table public.comic_reports enable row level security;
revoke all on public.comic_reports from anon, authenticated;
