-- Langkah "Tokoh" di wizard: tokoh pilihan guru disimpan per komik; wizard menjadi 5 langkah.

alter table public.comics
  add column tokoh_json jsonb not null default '[]'::jsonb
    check (jsonb_typeof(tokoh_json) = 'array' and jsonb_array_length(tokoh_json) <= 4);

alter table public.comics drop constraint comics_wizard_step_check;
alter table public.comics add constraint comics_wizard_step_check check (wizard_step between 1 and 5);

grant update (tokoh_json) on public.comics to authenticated;
