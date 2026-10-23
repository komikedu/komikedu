-- BELUM DITERAPKAN (penerapan lewat alat ditolak): jalankan manual di Supabase SQL Editor.
--
-- Halaman komunitas membaca data lewat server dengan daftar kolom yang dibatasi (src/lib/comics/komunitas.ts).
-- Kebijakan baca publik di bawah ini membuka SEMUA kolom komik terbit (cerita, naskah, tokoh, dst.) ke siapa pun
-- yang memegang kunci anon, padahal tidak lagi dipakai. Membuangnya tidak menghapus data apa pun.

drop policy if exists comics_public_read on public.comics;
drop policy if exists pages_public_read on public.pages;
drop policy if exists panels_public_read on public.panels;
drop policy if exists bubbles_public_read on public.bubbles;
drop policy if exists quizzes_public_read on public.quizzes;
