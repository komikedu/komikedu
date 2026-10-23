-- Batas tokoh per komik dinaikkan dari 4 ke 8. Referensi gambar tetap dibatasi per halaman (hanya tokoh
-- yang tampil di halaman itu), jadi menambah tokoh tidak membebani pembuatan gambar.

alter table public.comics drop constraint comics_tokoh_json_check;
alter table public.comics add constraint comics_tokoh_json_check
  check (jsonb_typeof(tokoh_json) = 'array' and jsonb_array_length(tokoh_json) <= 8);
