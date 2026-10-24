-- Wizard menulis tema dan bahasa komik (kolom dari 0031 sebelumnya hanya bisa dibaca klien), cerita sumber yang ditempel guru
-- bisa jauh lebih panjang dari arahan alur, dan wizard kini enam langkah.

grant update (tema, bahasa) on public.comics to authenticated;

alter table public.comics drop constraint if exists comics_cerita_check;
alter table public.comics add constraint comics_cerita_check check (cerita is null or char_length(cerita) <= 15000);

alter table public.comics drop constraint if exists comics_wizard_step_check;
alter table public.comics add constraint comics_wizard_step_check check (wizard_step between 1 and 6);
