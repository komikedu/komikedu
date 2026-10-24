-- Dari mana komik dibuat: topik pelajaran, PDF materi, atau cerita yang sudah ada (mis. dongeng yang ditempel guru).
-- Untuk 'cerita', kolom cerita berisi cerita sumber lengkap dan AI mengadaptasinya menjadi komik.

alter table public.comics
  add column if not exists sumber text not null default 'topik' check (sumber in ('topik', 'pdf', 'cerita'));

grant update (sumber) on public.comics to authenticated;
