-- Pilotage ministériel : un pasteur pilote un ministère
alter table public.profiles
  add column if not exists ministry_lead_of uuid references public.ministries(id) on delete set null;

create or replace function public.protect_profile_privileges() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null
     and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    if new.role is distinct from old.role
       or new.service_id is distinct from old.service_id
       or new.is_service_lead is distinct from old.is_service_lead
       or new.is_project_lead is distinct from old.is_project_lead
       or new.ministry_lead_of is distinct from old.ministry_lead_of
       or new.has_paid is distinct from old.has_paid then
      raise exception 'Modification réservée aux administrateurs';
    end if;
  end if;
  return new;
end $$;

-- Secrétaires (ou tout délégué) : accès par adresse e-mail à la vue d'un ministère
create table public.ministry_delegates (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references public.ministries(id) on delete cascade,
  email text not null,
  user_id uuid references auth.users(id) on delete set null,
  created_by uuid default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
create unique index ministry_delegates_unique on public.ministry_delegates (ministry_id, lower(email));
alter table public.ministry_delegates enable row level security;

create policy "délégués gérés par les admins" on public.ministry_delegates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "délégués lus par eux-mêmes" on public.ministry_delegates for select to authenticated
  using (user_id = auth.uid());

-- Rattache un accès en attente (saisi par e-mail) au compte qui vient de se connecter
create or replace function public.claim_delegations() returns void
language sql security definer set search_path = public, auth as $$
  update public.ministry_delegates d set user_id = auth.uid()
  where d.user_id is null
    and lower(d.email) = lower((select u.email from auth.users u where u.id = auth.uid()));
$$;

-- Ministères que l'utilisateur pilote, en propre ou par délégation
create or replace function public.steering_ministries() returns setof uuid
language sql stable security definer set search_path = public as $$
  select ministry_lead_of from public.profiles where id = auth.uid() and ministry_lead_of is not null
  union
  select ministry_id from public.ministry_delegates where user_id = auth.uid();
$$;

-- Attribution des rôles : réservée aux administrateurs. Le rôle est aussi inscrit dans le jeton de connexion,
-- que les règles de sécurité de la base utilisent.
create or replace function public.set_user_access(
  target uuid, new_role text, p_service_lead boolean, p_project_lead boolean,
  p_service uuid, p_ministry_lead uuid
) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;
  if new_role not in ('student', 'teacher', 'admin') then
    raise exception 'Rôle inconnu';
  end if;
  update public.profiles set
    role = new_role,
    is_service_lead = p_service_lead,
    is_project_lead = p_project_lead,
    service_id = p_service,
    ministry_lead_of = p_ministry_lead
  where id = target;
  update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role)
  where id = target;
end $$;

create or replace function public.admin_user_emails() returns table (id uuid, email text)
language sql stable security definer set search_path = public, auth as $$
  select u.id, u.email::text from auth.users u where public.is_admin();
$$;

revoke execute on function public.claim_delegations() from public, anon;
revoke execute on function public.steering_ministries() from public, anon;
revoke execute on function public.set_user_access(uuid, text, boolean, boolean, uuid, uuid) from public, anon;
revoke execute on function public.admin_user_emails() from public, anon;
grant execute on function public.claim_delegations() to authenticated;
grant execute on function public.steering_ministries() to authenticated;
grant execute on function public.set_user_access(uuid, text, boolean, boolean, uuid, uuid) to authenticated;
grant execute on function public.admin_user_emails() to authenticated;;
