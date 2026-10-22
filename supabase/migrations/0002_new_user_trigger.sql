-- Buat profil + kredit gratis (sekali per akun) saat user baru mendaftar lewat Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, nama, saldo_kredit)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    15
  )
  on conflict (id) do nothing;

  if found then
    insert into public.credit_ledger (user_id, perubahan, alasan)
    values (new.id, 15, 'kredit gratis pendaftaran');
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
