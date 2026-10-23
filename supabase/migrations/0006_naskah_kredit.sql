-- Tahap naskah: simpan outline, naskah, dan tanda cek; fungsi kredit atomik; kunci kolom yang dikelola server.

alter table public.comics
  add column outline_json jsonb,
  add column naskah_json jsonb,
  add column naskah_flags jsonb not null default '[]'::jsonb,
  add column naskah_status text not null default 'none'
    check (naskah_status in ('none', 'generating', 'review', 'approved', 'error')),
  add column naskah_error text,
  add column naskah_started_at timestamptz;

-- Klien hanya boleh mengubah kolom draft. Naskah, status, dan is_public diubah server (service role).
revoke update on public.comics from authenticated;
grant update (judul, topik, jenjang, tujuan, jumlah_halaman, gaya, wizard_step) on public.comics to authenticated;

-- Potong kredit secara atomik. false bila saldo tidak cukup.
create or replace function public.spend_credits(p_user uuid, p_amount integer, p_alasan text, p_ref uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_amount <= 0 then
    raise exception 'jumlah kredit harus positif';
  end if;
  update public.users set saldo_kredit = saldo_kredit - p_amount
  where id = p_user and saldo_kredit >= p_amount;
  if not found then
    return false;
  end if;
  insert into public.credit_ledger (user_id, perubahan, alasan, ref_id) values (p_user, -p_amount, p_alasan, p_ref);
  return true;
end;
$$;

-- Kembalikan kredit (mis. job gagal). Tercatat di ledger.
create or replace function public.refund_credits(p_user uuid, p_amount integer, p_alasan text, p_ref uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_amount <= 0 then
    raise exception 'jumlah kredit harus positif';
  end if;
  update public.users set saldo_kredit = saldo_kredit + p_amount where id = p_user;
  insert into public.credit_ledger (user_id, perubahan, alasan, ref_id) values (p_user, p_amount, p_alasan, p_ref);
end;
$$;

-- hanya server (service role) yang boleh memanggil fungsi kredit
revoke execute on function public.spend_credits(uuid, integer, text, uuid) from public, anon, authenticated;
revoke execute on function public.refund_credits(uuid, integer, text, uuid) from public, anon, authenticated;
grant execute on function public.spend_credits(uuid, integer, text, uuid) to service_role;
grant execute on function public.refund_credits(uuid, integer, text, uuid) to service_role;
