begin;

-- Fiche simplifiée et bannière. Les anciennes colonnes restent en place pour préserver les données.
alter table public.opportunities
  add column if not exists cover_image_path text;

alter table public.opportunity_dates
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists capacity integer check (capacity is null or capacity > 0);
update public.opportunity_dates set id = gen_random_uuid() where id is null;
alter table public.opportunity_dates alter column id set not null;
create unique index if not exists opportunity_dates_id_uidx on public.opportunity_dates(id);
update public.opportunity_dates d
set capacity = o.capacity
from public.opportunities o
where o.id = d.opportunity_id and d.capacity is null;

-- Une inscription appartient désormais à une séance précise.
create table if not exists public.opportunity_date_registrations (
  opportunity_date_id uuid not null references public.opportunity_dates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (opportunity_date_id, user_id)
);
create index if not exists opportunity_date_registrations_user_idx
  on public.opportunity_date_registrations(user_id, opportunity_date_id);

-- Les inscriptions historiques portaient sur toutes les dates : cette migration conserve cet accès.
insert into public.opportunity_date_registrations(opportunity_date_id, user_id, created_at)
select d.id, r.user_id, r.created_at
from public.opportunity_registrations r
join public.opportunity_dates d on d.opportunity_id = r.opportunity_id
on conflict do nothing;

alter table public.opportunity_date_registrations enable row level security;
create policy opportunity_date_registrations_read
on public.opportunity_date_registrations for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.opportunity_dates d
    where d.id = opportunity_date_id and public.can_contribute_opportunity(d.opportunity_id)
  )
);

-- Inscription multiple atomique : verrouillage des séances, contrôle des capacités et anti-doublon.
create or replace function public.register_for_opportunity_dates(p_opportunity uuid, p_dates uuid[])
returns void language plpgsql security definer set search_path = public
as $$
declare o public.opportunities%rowtype; d public.opportunity_dates%rowtype; taken integer;
begin
  if auth.uid() is null or coalesce(array_length(p_dates, 1), 0) = 0 then
    raise exception 'DATES_REQUIRED';
  end if;
  select * into o from public.opportunities where id = p_opportunity for update;
  if not found or not public.opportunity_is_visible(o) or not o.registration_open then
    raise exception 'INSCRIPTIONS_CLOSED';
  end if;
  if exists(select 1 from unnest(p_dates) x where not exists(
    select 1 from public.opportunity_dates od where od.id = x and od.opportunity_id = p_opportunity
  )) then raise exception 'INVALID_DATE'; end if;

  for d in
    select od.* from public.opportunity_dates od
    where od.opportunity_id = p_opportunity and od.id = any(p_dates)
    order by od.id for update
  loop
    if exists(select 1 from public.opportunity_date_registrations r where r.opportunity_date_id = d.id and r.user_id = auth.uid()) then
      continue;
    end if;
    select count(*) into taken from public.opportunity_date_registrations r where r.opportunity_date_id = d.id;
    if d.capacity is not null and taken >= d.capacity then raise exception 'CAPACITY_REACHED:%', d.id; end if;
    insert into public.opportunity_date_registrations(opportunity_date_id, user_id) values(d.id, auth.uid());
  end loop;
end $$;

create or replace function public.cancel_opportunity_date_registration(p_date uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare v_opportunity uuid;
begin
  select opportunity_id into v_opportunity from public.opportunity_dates where id = p_date;
  if v_opportunity is null then raise exception 'INVALID_DATE'; end if;
  if not exists(select 1 from public.opportunities where id = v_opportunity and cancellation_allowed) then
    raise exception 'CANCELLATION_NOT_ALLOWED';
  end if;
  delete from public.opportunity_date_registrations
  where opportunity_date_id = p_date and user_id = auth.uid();
end $$;

create or replace function public.opportunity_date_counts(p_opportunity uuid)
returns table(opportunity_date_id uuid, taken bigint)
language sql stable security definer set search_path = public as $$
  select d.id, count(r.user_id)
  from public.opportunity_dates d
  left join public.opportunity_date_registrations r on r.opportunity_date_id = d.id
  where d.opportunity_id = p_opportunity
    and exists(select 1 from public.opportunities o where o.id = p_opportunity
      and (public.opportunity_is_visible(o) or public.can_contribute_opportunity(p_opportunity)))
  group by d.id
$$;

-- Mise à jour différentielle des séances : les inscriptions des séances conservées restent intactes.
create or replace function public.replace_opportunity_dates(p_opportunity uuid, p_dates jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare d jsonb; v_id uuid; kept uuid[] := array[]::uuid[];
begin
  if not public.can_manage_opportunity(p_opportunity) then raise exception 'FORBIDDEN'; end if;
  for d in select value from jsonb_array_elements(coalesce(p_dates, '[]'::jsonb)) loop
    v_id := nullif(d->>'id', '')::uuid;
    if v_id is not null and exists(select 1 from public.opportunity_dates where id=v_id and opportunity_id=p_opportunity) then
      update public.opportunity_dates set
        session_date=(d->>'session_date')::date,
        start_time=(d->>'start_time')::time,
        end_time=(d->>'end_time')::time,
        room=nullif(d->>'room',''), location=nullif(d->>'location',''),
        capacity=nullif(d->>'capacity','')::integer
      where id=v_id;
    else
      insert into public.opportunity_dates(opportunity_id,session_date,start_time,end_time,room,location,capacity)
      values(p_opportunity,(d->>'session_date')::date,(d->>'start_time')::time,(d->>'end_time')::time,
        nullif(d->>'room',''),nullif(d->>'location',''),nullif(d->>'capacity','')::integer)
      returning id into v_id;
    end if;
    kept := array_append(kept, v_id);
  end loop;
  delete from public.opportunity_dates where opportunity_id=p_opportunity and not(id=any(kept));
  update public.opportunities set
    starts_on=(select min(session_date) from public.opportunity_dates where opportunity_id=p_opportunity),
    ends_on=(select max(session_date) from public.opportunity_dates where opportunity_id=p_opportunity),
    updated_at=now()
  where id=p_opportunity;
end $$;

create or replace function public.opportunity_counts()
returns table(opportunity_id uuid, taken bigint)
language sql stable security definer set search_path = public as $$
  select o.id, count(distinct r.user_id)
  from public.opportunities o
  left join public.opportunity_dates d on d.opportunity_id = o.id
  left join public.opportunity_date_registrations r on r.opportunity_date_id = d.id
  where public.opportunity_is_visible(o) or public.can_contribute_opportunity(o.id)
  group by o.id
$$;

create or replace function public.opportunity_participants(p_opp uuid)
returns table(full_name text, avatar_path text)
language sql stable security definer set search_path = public as $$
  select distinct p.full_name, p.avatar_path
  from public.opportunity_date_registrations r
  join public.opportunity_dates d on d.id = r.opportunity_date_id
  join public.profiles p on p.id = r.user_id
  where d.opportunity_id = p_opp and public.can_contribute_opportunity(p_opp)
  order by p.full_name
$$;

create or replace function public.opportunity_session_participants(p_opp uuid)
returns table(opportunity_date_id uuid, user_id uuid, full_name text)
language sql stable security definer set search_path = public as $$
  select d.id, p.id, p.full_name
  from public.opportunity_date_registrations r
  join public.opportunity_dates d on d.id = r.opportunity_date_id
  join public.profiles p on p.id = r.user_id
  where d.opportunity_id = p_opp and public.can_contribute_opportunity(p_opp)
  order by d.session_date, p.full_name
$$;

-- Services libres avec déduplication insensible à la casse et aux espaces.
create or replace function public.normalized_service_name(value text)
returns text language sql immutable parallel safe
as $$ select lower(regexp_replace(trim(coalesce(value, '')), '\s+', ' ', 'g')) $$;

do $$
declare duplicate record;
begin
  for duplicate in
    select public.normalized_service_name(name) normalized, (array_agg(id order by created_at, id))[1] canonical
    from public.services group by 1 having count(*) > 1
  loop
    update public.profiles p set service_id = duplicate.canonical
      where p.service_id in (select id from public.services where public.normalized_service_name(name) = duplicate.normalized and id <> duplicate.canonical);
    update public.opportunities o set service_id = duplicate.canonical
      where o.service_id in (select id from public.services where public.normalized_service_name(name) = duplicate.normalized and id <> duplicate.canonical);
    update public.sessions s set service_id = duplicate.canonical
      where s.service_id in (select id from public.services where public.normalized_service_name(name) = duplicate.normalized and id <> duplicate.canonical);
    delete from public.services where public.normalized_service_name(name) = duplicate.normalized and id <> duplicate.canonical;
  end loop;
end $$;
create unique index if not exists services_normalized_name_uidx
  on public.services(public.normalized_service_name(name));

create or replace function public.resolve_service_name(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_name text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
begin
  if v_name = '' then return null; end if;
  select id into v_id from public.services where public.normalized_service_name(name) = public.normalized_service_name(v_name) limit 1;
  if v_id is null then
    if not public.is_platform_admin() then raise exception 'FORBIDDEN'; end if;
    insert into public.services(name) values(v_name) returning id into v_id;
  end if;
  return v_id;
end $$;

-- Notifications quotidiennes personnalisées et idempotentes.
alter table public.announcements
  add column if not exists recipient_id uuid references public.profiles(id) on delete cascade;
create index if not exists announcements_recipient_created_idx
  on public.announcements(recipient_id, created_at desc) where recipient_id is not null;

drop policy if exists "messages lus par les étudiants concernés" on public.announcements;
create policy "messages lus par les étudiants concernés" on public.announcements
for select to authenticated using (
  recipient_id = auth.uid()
  or (
    recipient_id is null and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'student' and (
        (announcements.session_id is null and announcements.opportunity_id is null
          and (announcements.ministry_id is null or p.ministry_id = announcements.ministry_id)
          and (announcements.day is null or p.preferred_day = announcements.day))
        or (announcements.opportunity_id is not null and exists(
          select 1 from public.opportunity_date_registrations r
          join public.opportunity_dates d on d.id = r.opportunity_date_id
          where d.opportunity_id = announcements.opportunity_id and r.user_id = p.id))
        or (announcements.session_id is not null and exists(
          select 1 from public.sessions s where s.id = announcements.session_id
          and (s.session_type = 'commun' or s.ministry_id = p.ministry_id)))
      )
    )
  )
);

create table if not exists public.course_content_notification_log (
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content_type text not null check (content_type in ('material', 'assignment', 'video')),
  content_id uuid not null,
  available_at timestamptz not null,
  announcement_id uuid references public.announcements(id) on delete set null,
  notified_at timestamptz not null default now(),
  primary key(recipient_id, content_type, content_id)
);
alter table public.course_content_notification_log enable row level security;

create or replace function public.create_daily_course_content_digest(p_run_at timestamptz default now())
returns integer language plpgsql security definer set search_path = public as $$
declare student record; v_author uuid; v_count integer; v_body text; v_announcement uuid; v_sent integer := 0;
begin
  if extract(hour from (p_run_at at time zone 'Europe/Paris')) <> 9 then return 0; end if;
  select id into v_author from public.profiles where role = 'admin' order by created_at limit 1;
  if v_author is null then return 0; end if;

  for student in select id, ministry_id, preferred_day from public.profiles
    where role = 'student' and coalesce(deactivated, false) = false and email_confirmed
  loop
    with available as (
      select 'material'::text kind, m.id content_id, m.visible_at available_at, m.title label
      from public.materials m join public.sessions s on s.id = m.session_id
      where m.visible_at > p_run_at - interval '24 hours' and m.visible_at <= p_run_at
        and not coalesce(s.is_draft, false)
        and (s.session_type = 'commun' or s.ministry_id = student.ministry_id)
        and (s.session_type = 'commun' or student.preferred_day is null or s.day = student.preferred_day)
      union all
      select 'assignment', a.id, a.visible_at, coalesce(a.title, 'Nouveau devoir')
      from public.assignments a join public.sessions s on s.id = a.session_id
      where a.visible_at > p_run_at - interval '24 hours' and a.visible_at <= p_run_at
        and not coalesce(s.is_draft, false)
        and (s.session_type = 'commun' or s.ministry_id = student.ministry_id)
        and (s.session_type = 'commun' or student.preferred_day is null or s.day = student.preferred_day)
      union all
      select 'video', v.session_id, v.visible_at, coalesce(s.description, 'Nouvelle vidéo')
      from public.session_videos v join public.sessions s on s.id = v.session_id
      where v.visible_at > p_run_at - interval '24 hours' and v.visible_at <= p_run_at
        and not coalesce(s.is_draft, false)
        and (s.session_type = 'commun' or s.ministry_id = student.ministry_id)
        and (s.session_type = 'commun' or student.preferred_day is null or s.day = student.preferred_day)
    ), fresh as (
      select a.* from available a where not exists(
        select 1 from public.course_content_notification_log l
        where l.recipient_id = student.id and l.content_type = a.kind and l.content_id = a.content_id)
    )
    select count(*), string_agg('• ' || label, E'\n' order by available_at, label)
      into v_count, v_body from fresh;
    if v_count = 0 then continue; end if;

    insert into public.announcements(title, body, author_id, recipient_id, is_system, target_url, target_type, cta_label)
    values(
      case when v_count = 1 then 'Un nouveau contenu est disponible' else v_count || ' nouveaux contenus sont disponibles' end,
      'Voici les nouveautés accessibles depuis les dernières 24 heures :' || E'\n\n' || v_body,
      v_author, student.id, true, '/etudiant/cours', 'daily_content_digest', 'Voir les nouveautés'
    ) returning id into v_announcement;

    insert into public.course_content_notification_log(recipient_id, content_type, content_id, available_at, announcement_id, notified_at)
    select student.id, a.kind, a.content_id, a.available_at, v_announcement, p_run_at
    from (
      select 'material'::text kind, m.id content_id, m.visible_at available_at from public.materials m join public.sessions s on s.id=m.session_id
      where m.visible_at > p_run_at-interval '24 hours' and m.visible_at<=p_run_at and not coalesce(s.is_draft,false)
        and (s.session_type='commun' or s.ministry_id=student.ministry_id) and (s.session_type='commun' or student.preferred_day is null or s.day=student.preferred_day)
      union all
      select 'assignment', a.id, a.visible_at from public.assignments a join public.sessions s on s.id=a.session_id
      where a.visible_at > p_run_at-interval '24 hours' and a.visible_at<=p_run_at and not coalesce(s.is_draft,false)
        and (s.session_type='commun' or s.ministry_id=student.ministry_id) and (s.session_type='commun' or student.preferred_day is null or s.day=student.preferred_day)
      union all
      select 'video', v.session_id, v.visible_at from public.session_videos v join public.sessions s on s.id=v.session_id
      where v.visible_at > p_run_at-interval '24 hours' and v.visible_at<=p_run_at and not coalesce(s.is_draft,false)
        and (s.session_type='commun' or s.ministry_id=student.ministry_id) and (s.session_type='commun' or student.preferred_day is null or s.day=student.preferred_day)
    ) a on conflict do nothing;
    v_sent := v_sent + 1;
  end loop;
  return v_sent;
end $$;

-- Suppression demandée de l'annonce prématurée, sans toucher au contenu ni à sa date réelle.
delete from public.announcements
where lower(trim(title)) = lower('Nouvelle ressource : Calcule ton taux de générosité');

revoke all on function public.register_for_opportunity_dates(uuid,uuid[]) from public;
revoke all on function public.cancel_opportunity_date_registration(uuid) from public;
revoke all on function public.create_daily_course_content_digest(timestamptz) from public;
grant execute on function public.register_for_opportunity_dates(uuid,uuid[]) to authenticated;
grant execute on function public.cancel_opportunity_date_registration(uuid) to authenticated;
grant execute on function public.opportunity_date_counts(uuid) to authenticated;
grant execute on function public.opportunity_session_participants(uuid) to authenticated;
grant execute on function public.create_daily_course_content_digest(timestamptz) to service_role;

-- Exécution horaire, mais la fonction ne produit un récapitulatif qu'à 9 h à Paris.
-- Ce contrôle interne suit automatiquement les changements d'heure été/hiver.
create extension if not exists pg_cron with schema extensions;
do $$ begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'daily-course-content-digest';
exception when undefined_table then null;
end $$;
select cron.schedule(
  'daily-course-content-digest',
  '0 * * * *',
  $digest$select public.create_daily_course_content_digest(now());$digest$
);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('opportunity-covers', 'opportunity-covers', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;
create policy "opportunity covers public read" on storage.objects for select using(bucket_id='opportunity-covers');
create policy "opportunity covers managed upload" on storage.objects for insert to authenticated
with check(bucket_id='opportunity-covers' and public.can_manage_opportunity(((storage.foldername(name))[1])::uuid));
create policy "opportunity covers managed update" on storage.objects for update to authenticated
using(bucket_id='opportunity-covers' and public.can_manage_opportunity(((storage.foldername(name))[1])::uuid));

commit;
