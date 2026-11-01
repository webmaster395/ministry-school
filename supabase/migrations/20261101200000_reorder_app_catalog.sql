begin;

create or replace function public.reorder_app_catalog(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Accès refusé';
  end if;

  update public.app_catalog catalog
  set display_order = (ordered.ordinality * 10)::integer,
      updated_by = auth.uid()
  from unnest(p_ids) with ordinality as ordered(id, ordinality)
  where catalog.id = ordered.id
    and catalog.archived_at is null;
end;
$$;

revoke all on function public.reorder_app_catalog(uuid[]) from public, anon;
grant execute on function public.reorder_app_catalog(uuid[]) to authenticated;

commit;
