-- Penyimpanan editor: kolom tambahan agar balon dan panel bisa disimpan utuh.

alter table public.bubbles
  add column ekor jsonb,
  add column font_size smallint not null default 26 check (font_size between 8 and 96),
  add column tampil boolean not null default true,
  add column urutan integer not null default 0;

alter table public.panels
  add column tampil boolean not null default true;
