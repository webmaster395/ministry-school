
create or replace function public.current_user_role()
returns text
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  result text;
begin
  select role into result from profiles where id = auth.uid();
  return result;
end;
$$;
;
