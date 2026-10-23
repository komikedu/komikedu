-- Wizard bertahap: guru boleh menulis alur cerita sendiri; wizard kini 4 langkah.

alter table public.comics
  add column cerita text check (cerita is null or char_length(cerita) <= 2000);

alter table public.comics drop constraint comics_wizard_step_check;
alter table public.comics add constraint comics_wizard_step_check check (wizard_step between 1 and 4);

grant update (cerita) on public.comics to authenticated;
