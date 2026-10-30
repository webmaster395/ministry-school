
create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

drop policy "profiles readable by admin" on profiles;

create policy "profiles readable by admin" on profiles
  for select to authenticated using (public.current_user_role() = 'admin');
;
