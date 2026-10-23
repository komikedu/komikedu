-- Editor bisa menyisipkan panel/halaman di tengah (split, duplikat), sehingga nomor urut bergeser.
-- Upsert banyak baris sekaligus bisa sementara bentrok; cek keunikan di akhir transaksi saja.

alter table public.pages drop constraint pages_comic_id_urutan_key;
alter table public.pages add constraint pages_comic_id_urutan_key unique (comic_id, urutan) deferrable initially deferred;

alter table public.panels drop constraint panels_page_id_urutan_key;
alter table public.panels add constraint panels_page_id_urutan_key unique (page_id, urutan) deferrable initially deferred;
