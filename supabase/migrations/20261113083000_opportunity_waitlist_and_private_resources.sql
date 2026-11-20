begin;

-- Liste d’attente nominative, indépendante pour chaque séance.
create table if not exists public.opportunity_date_waitlist (
  opportunity_date_id uuid not null references public.opportunity_dates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (opportunity_date_id, user_id)
);

create index if not exists opportunity_date_waitlist_order_idx
  on public.opportunity_date_waitlist(opportunity_date_id, created_at);

alter table public.opportunity_date_waitlist enable row level security;

drop policy if exists opportunity_date_waitlist_read on public.opportunity_date_waitlist;
create policy opportunity_date_waitlist_read on public.opportunity_date_waitlist for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.opportunity_dates d
    where d.id = opportunity_date_id and public.can_contribute_opportunity(d.opportunity_id)
  )
);

create or replace function public.join_opportunity_date_waitlist(p_date uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare
  d public.opportunity_dates%rowtype;
  o public.opportunities%rowtype;
  taken integer;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  select * into d from public.opportunity_dates where id = p_date for update;
  if not found or d.session_date < current_date then raise exception 'INVALID_DATE'; end if;
  select * into o from public.opportunities where id = d.opportunity_id;
  if not found or not public.opportunity_is_visible(o) or not o.registration_open then
    raise exception 'INSCRIPTIONS_CLOSED';
  end if;
  if exists(select 1 from public.opportunity_date_registrations r where r.opportunity_date_id=p_date and r.user_id=auth.uid()) then
    raise exception 'ALREADY_REGISTERED';
  end if;
  select count(*) into taken from public.opportunity_date_registrations r where r.opportunity_date_id=p_date;
  if d.capacity is null or taken < d.capacity then raise exception 'PLACES_AVAILABLE'; end if;
  insert into public.opportunity_date_waitlist(opportunity_date_id,user_id)
  values(p_date,auth.uid()) on conflict do nothing;
end $$;

create or replace function public.leave_opportunity_date_waitlist(p_date uuid)
returns void language sql security definer set search_path = public
as $$
  delete from public.opportunity_date_waitlist
  where opportunity_date_id=p_date and user_id=auth.uid()
$$;

-- Une annulation libère la place et inscrit automatiquement la première personne en attente.
create or replace function public.cancel_opportunity_date_registration(p_date uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_opportunity uuid;
  next_user uuid;
  removed integer;
begin
  select opportunity_id into v_opportunity from public.opportunity_dates where id = p_date;
  if v_opportunity is null then raise exception 'INVALID_DATE'; end if;
  if not exists(select 1 from public.opportunities where id = v_opportunity and cancellation_allowed) then
    raise exception 'CANCELLATION_NOT_ALLOWED';
  end if;
  delete from public.opportunity_date_registrations
  where opportunity_date_id=p_date and user_id=auth.uid();
  get diagnostics removed = row_count;
  if removed = 0 then return; end if;

  select user_id into next_user
  from public.opportunity_date_waitlist
  where opportunity_date_id=p_date
  order by created_at,user_id
  for update skip locked
  limit 1;
  if next_user is not null then
    insert into public.opportunity_date_registrations(opportunity_date_id,user_id)
    values(p_date,next_user) on conflict do nothing;
    delete from public.opportunity_date_waitlist
    where opportunity_date_id=p_date and user_id=next_user;
  end if;
end $$;

-- Une inscription directe enlève toute ancienne entrée de liste d’attente.
create or replace function public.register_for_opportunity_dates(p_opportunity uuid, p_dates uuid[])
returns void language plpgsql security definer set search_path = public
as $$
declare o public.opportunities%rowtype; d public.opportunity_dates%rowtype; taken integer;
begin
  if auth.uid() is null or coalesce(array_length(p_dates,1),0)=0 then raise exception 'DATES_REQUIRED'; end if;
  select * into o from public.opportunities where id=p_opportunity for update;
  if not found or not public.opportunity_is_visible(o) or not o.registration_open then raise exception 'INSCRIPTIONS_CLOSED'; end if;
  if exists(select 1 from unnest(p_dates) x where not exists(
    select 1 from public.opportunity_dates od where od.id=x and od.opportunity_id=p_opportunity
  )) then raise exception 'INVALID_DATE'; end if;

  for d in select od.* from public.opportunity_dates od
    where od.opportunity_id=p_opportunity and od.id=any(p_dates)
    order by od.id for update
  loop
    if d.session_date < current_date then raise exception 'INVALID_DATE'; end if;
    if exists(select 1 from public.opportunity_date_registrations r where r.opportunity_date_id=d.id and r.user_id=auth.uid()) then
      continue;
    end if;
    select count(*) into taken from public.opportunity_date_registrations r where r.opportunity_date_id=d.id;
    if d.capacity is not null and taken>=d.capacity then raise exception 'CAPACITY_REACHED:%',d.id; end if;
    insert into public.opportunity_date_registrations(opportunity_date_id,user_id) values(d.id,auth.uid());
    delete from public.opportunity_date_waitlist where opportunity_date_id=d.id and user_id=auth.uid();
  end loop;
end $$;

grant execute on function public.join_opportunity_date_waitlist(uuid) to authenticated;
grant execute on function public.leave_opportunity_date_waitlist(uuid) to authenticated;

-- Les supports ne deviennent lisibles qu’après une séance suivie, ou par l’équipe gestionnaire.
create or replace function public.can_read_opportunity_resources(p_opportunity uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null and (
    public.can_contribute_opportunity(p_opportunity)
    or exists (
      select 1
      from public.opportunity_date_registrations r
      join public.opportunity_dates d on d.id=r.opportunity_date_id
      where d.opportunity_id=p_opportunity
        and r.user_id=auth.uid()
        and ((d.session_date + d.end_time) at time zone 'Europe/Paris') <= now()
    )
  )
$$;

grant execute on function public.can_read_opportunity_resources(uuid) to authenticated;

drop policy if exists opportunity_resources_read on public.opportunity_resources;
create policy opportunity_resources_read on public.opportunity_resources for select to authenticated
using (public.can_read_opportunity_resources(opportunity_id));

drop policy if exists "opportunity resources authorized read" on storage.objects;
create policy "opportunity resources authorized read" on storage.objects for select to authenticated
using (
  bucket_id='opportunity-resources'
  and exists (
    select 1 from public.opportunity_resources r
    where r.file_path=name and public.can_read_opportunity_resources(r.opportunity_id)
  )
);

commit;
