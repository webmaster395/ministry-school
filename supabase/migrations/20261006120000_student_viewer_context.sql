-- Contexte de navigation étudiant en un seul aller-retour PostgREST.
-- SECURITY INVOKER conserve strictement les RLS de l'utilisateur connecté.
create or replace function public.student_viewer_context()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'full_name', p.full_name,
    'role', p.role,
    'is_teacher', p.is_teacher,
    'deactivated', p.deactivated,
    'avatar_path', p.avatar_path,
    'created_at', p.created_at,
    'preferred_day', p.preferred_day,
    'ministry_id', p.ministry_id,
    'notifications_seen_at', p.notifications_seen_at,
    'notification_prefs', p.notification_prefs,
    'welcome_seen_at', p.welcome_seen_at,
    'is_service_lead', p.is_service_lead,
    'is_project_lead', p.is_project_lead,
    'ministry_slug', m.slug,
    'ministry_name', m.name,
    'steering_ministry_ids', coalesce(
      (select jsonb_agg(s.ministry_id) from public.steering_ministries() as s(ministry_id)),
      '[]'::jsonb
    ),
    'course_notes_enabled', exists (
      select 1
      from public.feature_preview_users f
      where f.feature_key = 'course_notes'
        and f.user_id = (select auth.uid())
    ),
    'unread_messages',
      coalesce((
        select count(*)
        from public.announcements a
        where a.created_at > coalesce(p.notifications_seen_at, '1970-01-01T00:00:00Z'::timestamptz)
      ), 0)
      + case
          when p.created_at >= coalesce(p.notifications_seen_at, '1970-01-01T00:00:00Z'::timestamptz)
          then coalesce((
            select count(*)
            from public.announcements a
            where a.is_welcome = true
          ), 0)
          else 0
        end
  )
  from public.profiles p
  left join public.ministries m on m.id = p.ministry_id
  where p.id = (select auth.uid());
$$;

revoke all on function public.student_viewer_context() from public;
grant execute on function public.student_viewer_context() to authenticated;

comment on function public.student_viewer_context() is
  'Contexte privé du viewer courant, consolidé sous les RLS existantes.';
