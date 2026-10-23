-- Salinan tetap komik yang diterbitkan: gambar tiap halaman (JPEG) dibuat sekali saat guru menerbitkan dan disimpan
-- di penyimpanan gambar. Halaman baca dan unduh PDF di komunitas memakai salinan ini, bukan data editor, sehingga
-- edit berikutnya tidak mengubah komik publik sampai diterbitkan ulang. Berisi daftar URL gambar, berurutan.
-- Hanya server (service role) yang menulis kolom ini, bersama status dan is_public.

alter table public.comics
  add column halaman_publik jsonb
  check (halaman_publik is null or (jsonb_typeof(halaman_publik) = 'array' and jsonb_array_length(halaman_publik) between 1 and 30));
