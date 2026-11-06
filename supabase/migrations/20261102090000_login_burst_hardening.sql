begin;

-- Le rattachement exécuté après connexion filtre d'abord par e-mail en attente.
-- L'ancien index commençait par ministry_id et ne pouvait pas servir ce filtre.
create index if not exists ministry_delegates_pending_email_idx
  on public.ministry_delegates (lower(email))
  where user_id is null;

-- Le contexte de navigation cherche les périmètres du viewer connecté.
create index if not exists ministry_delegates_user_scope_idx
  on public.ministry_delegates (user_id, ministry_id)
  where user_id is not null;

create index if not exists opportunity_assignments_user_scope_idx
  on public.opportunity_assignments (user_id, opportunity_id);

create index if not exists announcements_created_at_idx
  on public.announcements (created_at desc);

-- Le JWT a déjà été signé et vérifié par Supabase Auth. Son claim e-mail évite
-- une lecture de auth.users pour chacun des 400 rattachements. Le repli conserve
-- la compatibilité avec un ancien jeton qui ne contiendrait pas ce claim.
create or replace function public.claim_delegations()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer_id uuid := auth.uid();
  viewer_email text := nullif(auth.jwt() ->> 'email', '');
begin
  if viewer_id is null then
    return;
  end if;

  if viewer_email is null then
    select account.email
    into viewer_email
    from auth.users account
    where account.id = viewer_id;
  end if;

  if viewer_email is null then
    return;
  end if;

  update public.ministry_delegates delegate
  set user_id = viewer_id
  where delegate.user_id is null
    and lower(delegate.email) = lower(viewer_email);
end;
$$;

revoke all on function public.claim_delegations() from public, anon;
grant execute on function public.claim_delegations() to authenticated;

-- Les 400 étudiants ordinaires n'ont ni pilotage, ni rôle projet, ni file de
-- validation. Les CASE ci-dessous évitent d'appeler ces fonctions de droits
-- coûteuses quand les indicateurs du profil prouvent qu'elles retourneront vide.
-- Les comptes habilités conservent les fonctions de sécurité existantes.
create or replace function public.student_viewer_context()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with viewer as materialized (
    select
      profile.*,
      ministry.slug as ministry_slug,
      ministry.name as ministry_name,
      (profile.is_super_admin and not coalesce(profile.deactivated, false)) as super_admin,
      exists (
        select 1
        from public.ministry_delegates delegate
        where delegate.user_id = profile.id
      ) as has_delegation
    from public.profiles profile
    left join public.ministries ministry on ministry.id = profile.ministry_id
    where profile.id = (select auth.uid())
  )
  select jsonb_build_object(
    'full_name', viewer.full_name,
    'role', viewer.role,
    'is_teacher', viewer.is_teacher,
    'deactivated', viewer.deactivated,
    'avatar_path', viewer.avatar_path,
    'created_at', viewer.created_at,
    'preferred_day', viewer.preferred_day,
    'ministry_id', viewer.ministry_id,
    'notifications_seen_at', viewer.notifications_seen_at,
    'notification_prefs', viewer.notification_prefs,
    'welcome_seen_at', viewer.welcome_seen_at,
    'is_service_lead', viewer.is_service_lead,
    'is_project_lead', viewer.is_project_lead,
    'ministry_slug', viewer.ministry_slug,
    'ministry_name', viewer.ministry_name,
    'steering_ministry_ids', case
      when viewer.ministry_lead_of is null and not viewer.has_delegation
        then '[]'::jsonb
      else coalesce(
        (select jsonb_agg(scope.ministry_id) from public.strict_pilotage_ministries() scope),
        '[]'::jsonb
      )
    end,
    'super_admin', viewer.super_admin,
    'editorial_reviewer', viewer.super_admin,
    'projects_training_member', case
      when not viewer.can_create_opportunities and not viewer.is_projects_training_member
        then false
      else public.has_projects_training_access()
    end,
    'projects_training_creator', viewer.can_create_opportunities,
    'pending_validation_count', case
      when viewer.super_admin then public.pending_validation_count()
      else 0
    end,
    'course_notes_enabled', exists (
      select 1
      from public.feature_preview_users feature
      where feature.feature_key = 'course_notes'
        and feature.user_id = (select auth.uid())
    ),
    'unread_messages',
      coalesce((
        select count(*)
        from public.announcements announcement
        where announcement.created_at > coalesce(
          viewer.notifications_seen_at,
          '1970-01-01'::timestamptz
        )
      ), 0)
      + case
          when viewer.created_at >= coalesce(
            viewer.notifications_seen_at,
            '1970-01-01'::timestamptz
          ) then coalesce((
            select count(*)
            from public.announcements announcement
            where announcement.is_welcome = true
          ), 0)
          else 0
        end
  )
  from viewer;
$$;

revoke all on function public.student_viewer_context() from public;
grant execute on function public.student_viewer_context() to authenticated;

comment on function public.student_viewer_context() is
  'Contexte du viewer optimisé pour les arrivées synchronisées, sous les RLS existantes.';

-- Les triggers historiques s'exécutaient dans la transaction Auth qui met à
-- jour last_sign_in_at. Ils ajoutaient deux écritures au moment exact du pic,
-- puis le tracker de page répétait ces agrégations. Le navigateur marque
-- désormais explicitement une vraie connexion et l'enregistre après affichage.
drop trigger if exists capture_monthly_sign_in on auth.users;
drop trigger if exists capture_weekly_sign_in on auth.users;

-- Une session Auth ne peut incrémenter le compteur qu'une seule fois, même si
-- le navigateur répète le RPC ou si un client tente de forger le booléen.
create table if not exists public.recorded_student_auth_sessions (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  recorded_at timestamptz not null default now()
);
alter table public.recorded_student_auth_sessions enable row level security;
revoke all on table public.recorded_student_auth_sessions from public, anon, authenticated;
create index if not exists recorded_student_auth_sessions_recorded_at_idx
  on public.recorded_student_auth_sessions (recorded_at desc);

drop function if exists public.record_student_page_view(text);
create function public.record_student_page_view(
  p_page_key text,
  p_record_sign_in boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer_id uuid := (select auth.uid());
  viewed_at timestamptz := now();
  activity_day date := (viewed_at at time zone 'Europe/Paris')::date;
  activity_week date := date_trunc('week', viewed_at at time zone 'Europe/Paris')::date;
  activity_month date := date_trunc('month', viewed_at at time zone 'Europe/Paris')::date;
  auth_session_id uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  recorded_session_count integer := 0;
begin
  if viewer_id is null or p_page_key not in (
    'home', 'courses', 'course_detail', 'assignments', 'profile', 'notes', 'services_projects'
  ) then
    return;
  end if;
  if not exists (
    select 1
    from public.profiles profile
    where profile.id = viewer_id
      and profile.is_test_account = false
      and profile.deactivated = false
  ) then
    return;
  end if;

  insert into public.student_page_usage_daily (
    user_id, activity_date, page_key, view_count, first_view_at, last_view_at
  ) values (viewer_id, activity_day, p_page_key, 1, viewed_at, viewed_at)
  on conflict (user_id, activity_date, page_key) do update
  set view_count = public.student_page_usage_daily.view_count + 1,
      last_view_at = excluded.last_view_at;

  insert into public.weekly_user_activity (user_id, week_start, first_seen_at)
  values (viewer_id, activity_week, viewed_at)
  on conflict (user_id, week_start) do nothing;

  if p_record_sign_in and auth_session_id is not null then
    insert into public.recorded_student_auth_sessions (session_id, user_id, recorded_at)
    values (auth_session_id, viewer_id, viewed_at)
    on conflict (session_id) do nothing;
    get diagnostics recorded_session_count = row_count;
  end if;

  if recorded_session_count = 1 then
    insert into public.monthly_user_activity (
      user_id, activity_month, first_sign_in_at, last_sign_in_at, sign_in_count
    ) values (viewer_id, activity_month, viewed_at, viewed_at, 1)
    on conflict (user_id, activity_month) do update
    set last_sign_in_at = greatest(
          public.monthly_user_activity.last_sign_in_at,
          excluded.last_sign_in_at
        ),
        sign_in_count = public.monthly_user_activity.sign_in_count + 1;
  else
    -- Une session persistante peut traverser un changement de mois sans /token.
    insert into public.monthly_user_activity (
      user_id, activity_month, first_sign_in_at, last_sign_in_at, sign_in_count
    ) values (viewer_id, activity_month, viewed_at, viewed_at, 1)
    on conflict (user_id, activity_month) do nothing;
  end if;
end;
$$;

revoke all on function public.record_student_page_view(text, boolean) from public;
grant execute on function public.record_student_page_view(text, boolean) to authenticated;

commit;
