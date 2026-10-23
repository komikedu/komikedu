-- Kunci pembuatan gambar punya waktu mulai, sehingga kunci basi (server berhenti di tengah proses: restart, batas waktu hosting)
-- bisa diambil alih setelah beberapa menit. Sebelumnya panel yang tertinggal berstatus "generating" terkunci selamanya
-- dan setiap permintaan berikutnya ditolak dengan 409. Hanya server (service role) yang menulis kolom ini.

alter table public.panels add column generating_sejak timestamptz;
