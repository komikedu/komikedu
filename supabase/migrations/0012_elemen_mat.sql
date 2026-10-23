-- Elemen Mat (mis. kumpulan benda) disimpan per panel di math_elements_json.
-- Kolomnya sudah ada sejak 0001, tapi sejak 0009 klien hanya boleh menulis kolom panel tertentu.

grant insert (math_elements_json) on public.panels to authenticated;
grant update (math_elements_json) on public.panels to authenticated;
