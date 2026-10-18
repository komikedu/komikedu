-- KomikEdu: skema inti MVP + Row Level Security

create table public.users (
  id uuid primary key references auth.users on delete cascade,
  nama text,
  peran text check (peran in ('guru','kreator','penerbit')),
  sekolah text,
  saldo_kredit integer not null default 0 check (saldo_kredit >= 0),
  created_at timestamptz not null default now()
);

create table public.comics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  judul text not null,
  jenjang smallint not null check (jenjang between 1 and 6),
  mapel text not null default 'Matematika',
  tujuan text,
  gaya text,
  status text not null default 'draft' check (status in ('draft','diproses','terbit')),
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.source_materials (
  id uuid primary key default gen_random_uuid(),
  comic_id uuid not null references public.comics on delete cascade,
  file_url text,
  teks_ekstraksi text
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.users on delete cascade,
  nama text not null,
  deskripsi text,
  ref_image_urls text[] not null default '{}',
  is_preset boolean not null default false
);

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  comic_id uuid not null references public.comics on delete cascade,
  urutan integer not null,
  template_layout text,
  unique (comic_id, urutan)
);

create table public.panels (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages on delete cascade,
  urutan integer not null,
  script_json jsonb,
  math_elements_json jsonb,
  image_url text,
  posisi jsonb,
  status text not null default 'pending',
  unique (page_id, urutan)
);

create table public.bubbles (
  id uuid primary key default gen_random_uuid(),
  panel_id uuid not null references public.panels on delete cascade,
  jenis text not null check (jenis in ('bicara','pikir','narasi')),
  teks text not null,
  posisi jsonb,
  ukuran jsonb,
  arah_ekor text
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  comic_id uuid not null unique references public.comics on delete cascade,
  questions_json jsonb not null
);

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  jenis text not null,
  provider text,
  biaya numeric,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  perubahan integer not null,
  alasan text not null,
  ref_id uuid,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.users enable row level security;
alter table public.comics enable row level security;
alter table public.source_materials enable row level security;
alter table public.characters enable row level security;
alter table public.pages enable row level security;
alter table public.panels enable row level security;
alter table public.bubbles enable row level security;
alter table public.quizzes enable row level security;
alter table public.generations enable row level security;
alter table public.credit_ledger enable row level security;

-- users: baca dan ubah profil sendiri; kolom saldo_kredit hanya boleh diubah server (service role)
create policy users_self on public.users for select using (id = auth.uid());
create policy users_self_update on public.users for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.users from authenticated;
grant update (nama, peran, sekolah) on public.users to authenticated;

create policy comics_owner on public.comics for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy comics_public_read on public.comics for select using (is_public and status = 'terbit');

create policy materials_owner on public.source_materials for all
  using (exists (select 1 from public.comics c where c.id = comic_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.comics c where c.id = comic_id and c.user_id = auth.uid()));

create policy characters_read on public.characters for select using (is_preset or owner_id = auth.uid());
create policy characters_owner on public.characters for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid() and not is_preset);

create policy pages_owner on public.pages for all
  using (exists (select 1 from public.comics c where c.id = comic_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.comics c where c.id = comic_id and c.user_id = auth.uid()));
create policy pages_public_read on public.pages for select
  using (exists (select 1 from public.comics c where c.id = comic_id and c.is_public and c.status = 'terbit'));

create policy panels_owner on public.panels for all
  using (exists (select 1 from public.pages p join public.comics c on c.id = p.comic_id where p.id = page_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.pages p join public.comics c on c.id = p.comic_id where p.id = page_id and c.user_id = auth.uid()));
create policy panels_public_read on public.panels for select
  using (exists (select 1 from public.pages p join public.comics c on c.id = p.comic_id where p.id = page_id and c.is_public and c.status = 'terbit'));

create policy bubbles_owner on public.bubbles for all
  using (exists (select 1 from public.panels pn join public.pages p on p.id = pn.page_id join public.comics c on c.id = p.comic_id where pn.id = panel_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.panels pn join public.pages p on p.id = pn.page_id join public.comics c on c.id = p.comic_id where pn.id = panel_id and c.user_id = auth.uid()));
create policy bubbles_public_read on public.bubbles for select
  using (exists (select 1 from public.panels pn join public.pages p on p.id = pn.page_id join public.comics c on c.id = p.comic_id where pn.id = panel_id and c.is_public and c.status = 'terbit'));

create policy quizzes_owner on public.quizzes for all
  using (exists (select 1 from public.comics c where c.id = comic_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.comics c where c.id = comic_id and c.user_id = auth.uid()));
create policy quizzes_public_read on public.quizzes for select
  using (exists (select 1 from public.comics c where c.id = comic_id and c.is_public and c.status = 'terbit'));

-- generations dan credit_ledger: baca milik sendiri; tulis hanya lewat service role (server)
create policy generations_read on public.generations for select using (user_id = auth.uid());
create policy ledger_read on public.credit_ledger for select using (user_id = auth.uid());
