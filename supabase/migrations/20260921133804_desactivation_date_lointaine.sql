-- « infinity » fait échouer la connexion avec une erreur technique : on utilise une date très lointaine.
create or replace function public.set_user_active(target uuid, p_active boolean) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;
  if target = auth.uid() and not p_active then
    raise exception 'Vous ne pouvez pas désactiver votre propre compte';
  end if;
  update public.profiles set deactivated = not p_active where id = target;
  update auth.users
    set banned_until = case when p_active then null else now() + interval '100 years' end
  where id = target;
end $$;

update auth.users set banned_until = now() + interval '100 years' where banned_until = 'infinity';;
