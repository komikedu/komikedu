-- Gaya visual baru "kartun-sitkom": batasan nilai kolom comics.gaya diperluas.
-- Hanya mengganti aturan nilai yang boleh; data komik yang ada tidak berubah.

alter table public.comics drop constraint comics_gaya_check;
alter table public.comics add constraint comics_gaya_check
  check (gaya is null or gaya in ('kartun-cerah', 'anime-lembut', 'buku-cerita', 'kartun-sitkom'));
