alter table public.opportunities
  add column if not exists referent_id uuid references public.profiles(id);

create or replace function public.opportunity_referent(p_opp uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.full_name
  from public.opportunities o
  join public.profiles p on p.id = o.referent_id
  where o.id = p_opp;
$$;;
