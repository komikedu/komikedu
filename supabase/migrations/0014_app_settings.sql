-- Pengaturan aplikasi yang diubah dari halaman /admin (mis. provider gambar aktif).
-- Hanya server (service role) yang membaca dan menulis; tanpa policy sehingga klien tidak punya akses.

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users on delete set null
);

alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;
