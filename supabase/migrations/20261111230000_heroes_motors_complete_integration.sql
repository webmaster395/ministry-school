begin;

alter table public.heroes_motors_results
  alter column user_id drop not null,
  alter column source_email drop not null,
  alter column portrait drop not null;

alter table public.heroes_motors_results
  add column if not exists communication_status text not null default 'unknown',
  add column if not exists visible boolean not null default false,
  add column if not exists assignment_status text not null default 'unassigned',
  add column if not exists anomalies jsonb not null default '[]'::jsonb,
  add column if not exists source_submitted_at timestamptz,
  add column if not exists source_file_hash text,
  add column if not exists assignment_note text,
  add column if not exists last_modified_by uuid references public.profiles(id);

update public.heroes_motors_results
set communication_status = 'authorized',
    visible = publication_status = 'published',
    assignment_status = case when user_id is null then 'unassigned' else 'assigned' end
where communication_status = 'unknown';

alter table public.heroes_motors_results
  drop constraint if exists heroes_motors_results_communication_status_check,
  add constraint heroes_motors_results_communication_status_check
    check (communication_status in ('authorized', 'refused', 'unknown')),
  drop constraint if exists heroes_motors_results_assignment_status_check,
  add constraint heroes_motors_results_assignment_status_check
    check (assignment_status in ('assigned', 'unassigned', 'anomaly')),
  drop constraint if exists heroes_motors_results_anomalies_check,
  add constraint heroes_motors_results_anomalies_check
    check (jsonb_typeof(anomalies) = 'array');

-- Les contraintes historiques exigeaient 3 à 6 moteurs et exactement trois
-- héros. Il faut pouvoir conserver les réponses confidentielles, incomplètes
-- ou non attribuées sans les publier comme si elles étaient complètes.
do $$
declare constraint_name text;
begin
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.heroes_motors_results'::regclass
      and contype = 'c'
      and (
        pg_get_constraintdef(oid) ilike '%jsonb_array_length(motors)%'
        or pg_get_constraintdef(oid) ilike '%jsonb_array_length(heroes)%'
      )
  loop
    execute format('alter table public.heroes_motors_results drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.heroes_motors_results
  add constraint heroes_motors_results_heroes_count_check
    check (jsonb_array_length(heroes) <= 3),
  add constraint heroes_motors_results_publication_safety_check
    check (
      publication_status <> 'published'
      or communication_status = 'refused'
      or (portrait is not null and length(trim(portrait)) > 0)
    );

create index if not exists heroes_motors_results_assignment_idx
  on public.heroes_motors_results(assignment_status, visible, communication_status);

create table if not exists public.heroes_motors_result_audit (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.heroes_motors_results(id) on delete restrict,
  actor_id uuid references public.profiles(id),
  action text not null check (action in ('insert', 'update', 'assignment', 'visibility', 'communication')),
  changed_fields text[] not null default '{}',
  previous_value jsonb,
  next_value jsonb,
  created_at timestamptz not null default now()
);

alter table public.heroes_motors_result_audit enable row level security;
revoke all on public.heroes_motors_result_audit from anon, authenticated;
grant select, insert on public.heroes_motors_result_audit to authenticated;

drop policy if exists "heroes motors audit super admin reads" on public.heroes_motors_result_audit;
create policy "heroes motors audit super admin reads"
  on public.heroes_motors_result_audit for select to authenticated
  using (public.is_super_admin());
drop policy if exists "heroes motors audit super admin inserts" on public.heroes_motors_result_audit;
create policy "heroes motors audit super admin inserts"
  on public.heroes_motors_result_audit for insert to authenticated
  with check (public.is_super_admin() and actor_id = auth.uid());

drop policy if exists "heroes motors owner reads published result" on public.heroes_motors_results;
drop policy if exists "heroes motors super admin manages" on public.heroes_motors_results;
create policy "heroes motors super admin manages"
  on public.heroes_motors_results for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

revoke all on public.heroes_motors_results from anon, authenticated;
grant select, insert, update on public.heroes_motors_results to authenticated;

-- L'étudiant ne lit jamais directement source_payload. La fonction ne renvoie
-- aucun contenu individuel lorsque la communication a été refusée.
create or replace function public.get_my_heroes_motors_result()
returns table (
  id uuid,
  first_name text,
  communication_status text,
  portrait text,
  motors jsonb,
  heroes jsonb,
  published_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    r.id,
    r.first_name,
    r.communication_status,
    case when r.communication_status = 'authorized' then r.portrait else null end,
    case when r.communication_status = 'authorized' then r.motors else '[]'::jsonb end,
    case when r.communication_status = 'authorized' then r.heroes else '[]'::jsonb end,
    coalesce(r.published_at, r.updated_at)
  from public.heroes_motors_results r
  where r.user_id = auth.uid()
    and r.publication_status = 'published'
    and r.visible
    and r.communication_status in ('authorized', 'refused')
    and (
      public.is_super_admin()
      or exists (
        select 1 from public.app_catalog a
        where a.slug = 'test-des-heros'
          and a.status = 'published'
          and a.student_enabled
          and (a.student_publish_at is null or a.student_publish_at <= now())
      )
    )
  order by coalesce(r.published_at, r.updated_at) desc
  limit 1;
$$;

revoke all on function public.get_my_heroes_motors_result() from public, anon;
grant execute on function public.get_my_heroes_motors_result() to authenticated;

create or replace function public.heroes_motors_admin_accounts()
returns table (user_id uuid, email text, full_name text, deactivated boolean)
language sql
security definer
set search_path = public
as $$
  select p.id, lower(u.email)::text, p.full_name, coalesce(p.deactivated, false)
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_super_admin()
    and not coalesce(p.is_test_account, false)
  order by p.full_name, lower(u.email);
$$;

revoke all on function public.heroes_motors_admin_accounts() from public, anon;
grant execute on function public.heroes_motors_admin_accounts() to authenticated;

insert into public.app_catalog(
  slug, name, short_description, category, icon_url, destination_url, status,
  display_order, integration_key, public_enabled, student_enabled
)
values (
  'test-des-heros', 'Test des héros',
  'Retrouve ton portrait, tes moteurs et les personnes qui t’inspirent.',
  'Identité', '/identity/stories/identity.webp', '/apps/test-des-heros',
  'draft', 45, 'heroes-motors', false, false
)
on conflict(slug) do update set
  name = excluded.name,
  short_description = excluded.short_description,
  category = excluded.category,
  icon_url = excluded.icon_url,
  destination_url = excluded.destination_url,
  integration_key = excluded.integration_key;

commit;
