begin;

-- Les trois lectures personnelles utilisées par « Qui je suis ? » restent des
-- recherches indexées, même lorsque plusieurs centaines de sessions arrivent.
create index if not exists grace_identity_assessments_user_completed_idx
  on public.grace_identity_assessments(user_id, completed_at desc)
  where completed_at is not null;

create index if not exists profiles_active_student_count_idx
  on public.profiles(id)
  where role = 'student'
    and not coalesce(deactivated, false)
    and not coalesce(is_test_account, false);

-- Un seul appel PostgREST construit le flux privé. La fonction ne prend aucun
-- identifiant utilisateur en entrée : auth.uid() est l'unique périmètre. Les
-- règles de listes sont évaluées en ensemble, pas outil par outil côté client.
create or replace function public.student_identity_feed()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_profile public.profiles;
  is_super_admin boolean := false;
  grace_results jsonb := '[]'::jsonb;
  life_line_result jsonb;
  heroes_result jsonb;
  visible_tools jsonb := '[]'::jsonb;
begin
  if current_user_id is null then
    raise exception 'IDENTITY_ACCESS_DENIED' using errcode = '42501';
  end if;

  select profile.* into current_profile
  from public.profiles profile
  where profile.id = current_user_id
    and not coalesce(profile.deactivated, false);

  if current_profile.id is null then
    raise exception 'IDENTITY_ACCESS_DENIED' using errcode = '42501';
  end if;

  is_super_admin := public.is_super_admin(current_user_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'kind', assessment.test_key,
    'completedAt', assessment.completed_at,
    'results', assessment.results
  ) order by assessment.completed_at desc), '[]'::jsonb)
  into grace_results
  from public.grace_identity_assessments assessment
  where assessment.user_id = current_user_id
    and assessment.completed_at is not null;

  select jsonb_build_object(
    'completedAt', coalesce(journey.completed_at, journey.updated_at)
  )
  into life_line_result
  from public.life_line_journeys journey
  where journey.user_id = current_user_id;

  select jsonb_build_object(
    'firstName', result.first_name,
    'portrait', result.portrait,
    'motors', result.motors,
    'heroes', result.heroes,
    'publishedAt', result.published_at
  )
  into heroes_result
  from public.heroes_motors_results result
  where result.user_id = current_user_id
    and result.publication_status = 'published';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', app.id,
    'slug', app.slug,
    'name', app.name,
    'iconUrl', app.icon_url,
    'destinationUrl', app.destination_url
  ) order by app.display_order, app.name), '[]'::jsonb)
  into visible_tools
  from public.app_catalog app
  left join public.resource_access_controls access
    on access.resource_type = 'app_catalog' and access.resource_id = app.id
  where app.archived_at is null
    and app.status in ('scheduled', 'published')
    and app.student_enabled
    and (app.student_publish_at is null or app.student_publish_at <= now())
    and exists(
      select 1 from public.app_studio_settings settings
      where settings.singleton and settings.student_tools_enabled
    )
    and (
      access.resource_id is null
      or is_super_admin
      or access.visibility_mode = 'all_authenticated'
      or (
        access.visibility_mode = 'selected_users'
        and exists(
          select 1 from public.resource_access_users direct_access
          where direct_access.resource_type = 'app_catalog'
            and direct_access.resource_id = app.id
            and direct_access.user_id = current_user_id
        )
      )
      or (
        access.visibility_mode = 'selected_lists'
        and exists(
          select 1
          from public.resource_access_lists list_access
          join public.user_list_members membership on membership.list_id = list_access.list_id
          where list_access.resource_type = 'app_catalog'
            and list_access.resource_id = app.id
            and membership.user_id = current_user_id
        )
      )
    );

  return jsonb_build_object(
    'dashboard', jsonb_build_object(
      'profile', jsonb_build_object(
        'firstName', split_part(trim(coalesce(current_profile.full_name, '')), ' ', 1),
        'memberSince', current_profile.created_at,
        'certified', false,
        'gender', current_profile.gender
      ),
      'metrics', jsonb_build_object(
        'studentCount', (
          select count(*)::integer
          from public.profiles profile
          where profile.role = 'student'
            and not coalesce(profile.deactivated, false)
            and not coalesce(profile.is_test_account, false)
        ),
        'completedTests', jsonb_array_length(grace_results)
      ),
      'identityResults', grace_results,
      'financeResults', '[]'::jsonb,
      'recommendations', '[]'::jsonb
    ),
    'lifeLine', life_line_result,
    'heroesMotors', heroes_result,
    'tools', visible_tools
  );
end;
$$;

revoke all on function public.student_identity_feed() from public, anon;
grant execute on function public.student_identity_feed() to authenticated;

comment on function public.student_identity_feed() is
  'Single private read model for the identity gallery, including set-based list access.';

create or replace function public.student_grace_identity_tool()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  is_super_admin boolean := false;
  tool_record public.app_catalog;
  student_visible boolean := false;
  assessments jsonb := '[]'::jsonb;
begin
  if current_user_id is null or not exists(
    select 1 from public.profiles profile
    where profile.id = current_user_id and not coalesce(profile.deactivated, false)
  ) then
    raise exception 'IDENTITY_ACCESS_DENIED' using errcode = '42501';
  end if;

  is_super_admin := public.is_super_admin(current_user_id);

  select app.* into tool_record
  from public.app_catalog app
  where app.slug = 'je-suis-par-la-grace-de-dieu'
    and (
      is_super_admin
      or (
        app.archived_at is null
        and app.status in ('scheduled', 'published')
        and app.student_enabled
        and (app.student_publish_at is null or app.student_publish_at <= now())
        and exists(
          select 1 from public.app_studio_settings settings
          where settings.singleton and settings.student_tools_enabled
        )
        and public.can_access_resource('app_catalog', app.id, current_user_id)
      )
    )
  limit 1;

  if tool_record.id is null then
    return jsonb_build_object('allowed', false, 'studentVisible', false, 'assessments', '[]'::jsonb);
  end if;

  student_visible := tool_record.archived_at is null
    and tool_record.status in ('scheduled', 'published')
    and tool_record.student_enabled
    and (tool_record.student_publish_at is null or tool_record.student_publish_at <= now());

  select coalesce(jsonb_agg(jsonb_build_object(
    'test_key', assessment.test_key,
    'answers', assessment.answers,
    'results', assessment.results,
    'completed_at', assessment.completed_at,
    'updated_at', assessment.updated_at
  ) order by assessment.updated_at desc), '[]'::jsonb)
  into assessments
  from public.grace_identity_assessments assessment
  where assessment.user_id = current_user_id;

  return jsonb_build_object(
    'allowed', true,
    'studentVisible', student_visible,
    'assessments', assessments
  );
end;
$$;

revoke all on function public.student_grace_identity_tool() from public, anon;
grant execute on function public.student_grace_identity_tool() to authenticated;

create or replace function public.save_grace_identity_assessment(
  p_test_key text,
  p_answers jsonb,
  p_results jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  saved public.grace_identity_assessments;
begin
  if current_user_id is null or not exists(
    select 1 from public.profiles profile
    where profile.id = current_user_id and not coalesce(profile.deactivated, false)
  ) then
    raise exception 'IDENTITY_ACCESS_DENIED' using errcode = '42501';
  end if;
  if p_test_key not in ('fruit', 'gifts', 'skills') then
    raise exception 'INVALID_TEST_KEY' using errcode = '22023';
  end if;
  if jsonb_typeof(p_answers) is distinct from 'object'
    or jsonb_typeof(p_results) is distinct from 'object' then
    raise exception 'INVALID_ASSESSMENT' using errcode = '22023';
  end if;

  insert into public.grace_identity_assessments(user_id, test_key, answers, results, completed_at)
  values(current_user_id, p_test_key, p_answers, p_results, now())
  on conflict(user_id, test_key) do update set
    answers = excluded.answers,
    results = excluded.results,
    completed_at = excluded.completed_at,
    updated_at = now()
  returning * into saved;

  return jsonb_build_object(
    'test_key', saved.test_key,
    'answers', saved.answers,
    'results', saved.results,
    'completed_at', saved.completed_at,
    'updated_at', saved.updated_at
  );
end;
$$;

revoke all on function public.save_grace_identity_assessment(text,jsonb,jsonb) from public, anon;
grant execute on function public.save_grace_identity_assessment(text,jsonb,jsonb) to authenticated;

commit;
