create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
alter table public.services enable row level security;
create policy "services lisibles" on public.services for select to authenticated using (true);
create policy "services gérés par les admins" on public.services for all to authenticated
  using (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin')
  with check (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');

insert into public.services (name) values ('Créatech'), ('Enfants'), ('Youth'), ('Accueil'), ('Événementiel'), ('Communication'), ('Action sociale');

alter table public.profiles
  add column if not exists service_id uuid references public.services(id) on delete set null,
  add column if not exists is_service_lead boolean not null default false,
  add column if not exists is_project_lead boolean not null default false;

-- Un utilisateur ne peut pas s'accorder lui-même un rôle : seuls les admins changent ces colonnes.
create or replace function public.protect_profile_privileges() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null
     and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    if new.role is distinct from old.role
       or new.service_id is distinct from old.service_id
       or new.is_service_lead is distinct from old.is_service_lead
       or new.is_project_lead is distinct from old.is_project_lead
       or new.has_paid is distinct from old.has_paid then
      raise exception 'Modification réservée aux administrateurs';
    end if;
  end if;
  return new;
end $$;
create trigger protect_profile_privileges before update on public.profiles
  for each row execute function public.protect_profile_privileges();

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('formation', 'projet')),
  title text not null,
  description text not null default '',
  service_id uuid references public.services(id) on delete set null,
  organizer_label text,
  schedule_label text,
  starts_on date,
  ends_on date,
  capacity int check (capacity is null or capacity > 0),
  registration_open boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.opportunity_registrations (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (opportunity_id, user_id)
);

create or replace function public.is_admin() returns boolean
language sql stable as $$ select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' $$;

create or replace function public.can_propose(p_kind text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and ((p_kind = 'formation' and p.is_service_lead) or (p_kind = 'projet' and p.is_project_lead))
    );
$$;

create or replace function public.has_room(p_opp uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    o.registration_open
    and (o.ends_on is null or o.ends_on >= current_date)
    and (o.capacity is null or (select count(*) from public.opportunity_registrations r where r.opportunity_id = o.id) < o.capacity),
    false)
  from public.opportunities o where o.id = p_opp;
$$;

create or replace function public.opportunity_counts() returns table (opportunity_id uuid, taken bigint)
language sql stable security definer set search_path = public as $$
  select r.opportunity_id, count(*) from public.opportunity_registrations r group by r.opportunity_id;
$$;

create or replace function public.opportunity_participants(p_opp uuid) returns table (full_name text)
language sql stable security definer set search_path = public as $$
  select p.full_name from public.opportunity_registrations r
  join public.profiles p on p.id = r.user_id
  join public.opportunities o on o.id = r.opportunity_id
  where r.opportunity_id = p_opp and (o.created_by = auth.uid() or public.is_admin())
  order by r.created_at;
$$;

alter table public.opportunities enable row level security;
alter table public.opportunity_registrations enable row level security;

create policy "offres lisibles" on public.opportunities for select to authenticated using (true);
create policy "offres proposées par les responsables" on public.opportunities for insert to authenticated
  with check (created_by = auth.uid() and public.can_propose(kind));
create policy "offres modifiées par leur auteur" on public.opportunities for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());
create policy "offres supprimées par leur auteur" on public.opportunities for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

create policy "inscriptions lues par leur auteur" on public.opportunity_registrations for select to authenticated
  using (user_id = auth.uid());
create policy "inscription à une offre avec des places" on public.opportunity_registrations for insert to authenticated
  with check (user_id = auth.uid() and public.has_room(opportunity_id));
create policy "désinscription" on public.opportunity_registrations for delete to authenticated
  using (user_id = auth.uid());;
