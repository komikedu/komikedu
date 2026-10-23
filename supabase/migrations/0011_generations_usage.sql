-- Catat pemakaian per panggilan AI: satu baris per panggilan model, dengan jumlah token dan perkiraan biaya.

alter table public.generations
  add column model text,
  add column input_tokens integer,
  add column output_tokens integer;

comment on column public.generations.biaya is 'Perkiraan biaya panggilan dalam USD, dihitung dari token dan tarif di src/lib/ai/usage.ts';
