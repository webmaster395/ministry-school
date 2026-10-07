-- Statistiques produit minimales et privées. Le suivi démarre le 7 octobre 2026 :
-- aucune donnée antérieure n'est reconstituée.

create table if not exists public.weekly_user_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  first_seen_at timestamptz not null default now(),
  primary key (user_id, week_start),
  constraint weekly_user_activity_week_start check (
    week_start = date_trunc('week', week_start)::date
  )
);

create table if not exists public.student_page_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  page_key text not null check (page_key in (
    'home', 'courses', 'course_detail', 'assignments', 'profile', 'notes', 'services_projects'
  )),
  view_count integer not null default 1 check (view_count > 0),
  first_view_at timestamptz not null default now(),
  last_view_at timestamptz not null default now(),
  primary key (user_id, activity_date, page_key)
);

create table if not exists public.material_download_usage (
  material_id uuid not null references public.materials(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  open_count integer not null default 1 check (open_count > 0),
  first_opened_at timestamptz not null default now(),
  last_opened_at timestamptz not null default now(),
  primary key (material_id, user_id)
);

alter table public.weekly_user_activity enable row level security;
alter table public.student_page_usage_daily enable row level security;
alter table public.material_download_usage enable row level security;

revoke all on table public.weekly_user_activity from public, anon, authenticated;
revoke all on table public.student_page_usage_daily from public, anon, authenticated;
revoke all on table public.material_download_usage from public, anon, authenticated;

create index if not exists student_page_usage_daily_page_date_idx
  on public.student_page_usage_daily (page_key, activity_date);
create index if not exists material_download_usage_last_opened_idx
  on public.material_download_usage (last_opened_at desc);

create or replace function public.capture_weekly_sign_in()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_week date;
begin
  if new.last_sign_in_at is null
     or new.last_sign_in_at is not distinct from old.last_sign_in_at then
    return new;
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = new.id and p.is_test_account = false
  ) then
    return new;
  end if;
  v_week := date_trunc('week', new.last_sign_in_at at time zone 'Europe/Paris')::date;
  insert into public.weekly_user_activity (user_id, week_start, first_seen_at)
  values (new.id, v_week, new.last_sign_in_at)
  on conflict (user_id, week_start) do nothing;
  return new;
end;
$$;

drop trigger if exists capture_weekly_sign_in on auth.users;
create trigger capture_weekly_sign_in
after update of last_sign_in_at on auth.users
for each row execute function public.capture_weekly_sign_in();

create or replace function public.record_student_page_view(p_page_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_now timestamptz := now();
  v_date date := (v_now at time zone 'Europe/Paris')::date;
  v_week date := date_trunc('week', v_now at time zone 'Europe/Paris')::date;
  v_month date := date_trunc('month', v_now at time zone 'Europe/Paris')::date;
begin
  if v_user is null or p_page_key not in (
    'home', 'courses', 'course_detail', 'assignments', 'profile', 'notes', 'services_projects'
  ) then
    return;
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = v_user and p.is_test_account = false and p.deactivated = false
  ) then
    return;
  end if;

  insert into public.student_page_usage_daily (
    user_id, activity_date, page_key, view_count, first_view_at, last_view_at
  ) values (v_user, v_date, p_page_key, 1, v_now, v_now)
  on conflict (user_id, activity_date, page_key) do update
  set view_count = public.student_page_usage_daily.view_count + 1,
      last_view_at = excluded.last_view_at;

  insert into public.weekly_user_activity (user_id, week_start, first_seen_at)
  values (v_user, v_week, v_now)
  on conflict (user_id, week_start) do nothing;

  -- Une session persistante peut traverser un changement de mois sans nouveau login.
  insert into public.monthly_user_activity (
    user_id, activity_month, first_sign_in_at, last_sign_in_at, sign_in_count
  ) values (v_user, v_month, v_now, v_now, 1)
  on conflict (user_id, activity_month) do nothing;
end;
$$;

revoke all on function public.record_student_page_view(text) from public;
grant execute on function public.record_student_page_view(text) to authenticated;

create or replace function public.record_material_download(p_material_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then return; end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = v_user and p.is_test_account = false and p.deactivated = false
  ) then return; end if;
  if not exists (
    select 1
    from public.materials m
    join public.sessions s on s.id = m.session_id
    join public.profiles p on p.id = v_user
    where m.id = p_material_id
      and m.visible_at <= now()
      and (
        s.session_type = 'commun'
        or s.ministry_id = p.ministry_id
        or exists (
          select 1 from public.enrollments e
          where e.session_id = s.id and e.student_id = v_user
        )
      )
  ) then return; end if;

  insert into public.material_download_usage (
    material_id, user_id, open_count, first_opened_at, last_opened_at
  ) values (p_material_id, v_user, 1, now(), now())
  on conflict (material_id, user_id) do update
  set open_count = public.material_download_usage.open_count + 1,
      last_opened_at = excluded.last_opened_at;
end;
$$;

revoke all on function public.record_material_download(uuid) from public;
grant execute on function public.record_material_download(uuid) to authenticated;

create or replace function public.admin_weekly_active_users()
returns table(week_start date, active_users bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Accès réservé aux administrateurs' using errcode = '42501'; end if;
  return query
  select a.week_start, count(*)::bigint
  from public.weekly_user_activity a
  join public.profiles p on p.id = a.user_id and p.is_test_account = false
  group by a.week_start order by a.week_start;
end;
$$;

create or replace function public.admin_page_usage()
returns table(page_key text, views bigint, unique_users bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Accès réservé aux administrateurs' using errcode = '42501'; end if;
  return query
  select u.page_key, sum(u.view_count)::bigint, count(distinct u.user_id)::bigint
  from public.student_page_usage_daily u
  join public.profiles p on p.id = u.user_id and p.is_test_account = false
  group by u.page_key order by sum(u.view_count) desc;
end;
$$;

create or replace function public.admin_material_downloads()
returns table(material_id uuid, document_title text, course_title text, downloads bigint, unique_users bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Accès réservé aux administrateurs' using errcode = '42501'; end if;
  return query
  select m.id, m.title, coalesce(c.title, s.description, 'Cours'),
         coalesce(sum(d.open_count), 0)::bigint,
         count(distinct d.user_id)::bigint
  from public.materials m
  join public.sessions s on s.id = m.session_id
  left join public.courses c on c.id = s.course_id
  left join public.material_download_usage d on d.material_id = m.id
  group by m.id, m.title, c.title, s.description
  order by coalesce(sum(d.open_count), 0) desc, m.title;
end;
$$;

create or replace function public.admin_account_usage_state()
returns table(never_signed_in bigint, disabled_accounts bigint, observed_since_tracking bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Accès réservé aux administrateurs' using errcode = '42501'; end if;
  return query
  select
    count(*) filter (where u.last_sign_in_at is null)::bigint,
    count(*) filter (where p.deactivated = true)::bigint,
    count(*) filter (where exists (
      select 1 from public.student_page_usage_daily v where v.user_id = p.id
    ))::bigint
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.is_test_account = false;
end;
$$;

revoke all on function public.admin_weekly_active_users() from public;
revoke all on function public.admin_page_usage() from public;
revoke all on function public.admin_material_downloads() from public;
revoke all on function public.admin_account_usage_state() from public;
grant execute on function public.admin_weekly_active_users() to authenticated;
grant execute on function public.admin_page_usage() to authenticated;
grant execute on function public.admin_material_downloads() to authenticated;
grant execute on function public.admin_account_usage_state() to authenticated;
