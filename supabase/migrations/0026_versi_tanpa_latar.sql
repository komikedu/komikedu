-- Gambar panel yang latarnya dihapus (karakter saja) tercatat di riwayat versi dengan sumber 'tanpa-latar'.
alter table public.panel_images drop constraint if exists panel_images_sumber_check;
alter table public.panel_images
  add constraint panel_images_sumber_check check (sumber in ('halaman', 'edit', 'salinan', 'unggah', 'tanpa-latar'));
