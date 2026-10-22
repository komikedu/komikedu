-- handle_new_user() hanya untuk trigger on_auth_user_created; jangan bisa dipanggil lewat RPC.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
