-- Sidik pengaturan komik saat naskah ditulis (ditulis server). Dipakai untuk memberi tahu guru bila pengaturan di wizard
-- berubah sesudah naskah dibuat, sehingga naskahnya sudah tidak sesuai.

alter table public.comics add column if not exists naskah_pengaturan text;
