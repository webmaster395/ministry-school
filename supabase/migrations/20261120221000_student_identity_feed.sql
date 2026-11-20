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
  dashboard_result jsonb := '{}'::jsonb;
  life_line_result jsonb;
  heroes_result jsonb;
  visible_tools jsonb := '[]'::jsonb;
  tool_progress jsonb := '[]'::jsonb;
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

  dashboard_result := public.student_identity_dashboard();

  select jsonb_build_object(
    'completedAt', coalesce(journey.completed_at, journey.updated_at)
  )
  into life_line_result
  from public.life_line_journeys journey
  where journey.user_id = current_user_id;

  select jsonb_build_object(
    'id', result.id,
    'firstName', result.first_name,
    'communicationStatus', result.communication_status,
    'portrait', case when result.communication_status = 'authorized' then result.portrait else null end,
    'motors', case when result.communication_status = 'authorized' then result.motors else '[]'::jsonb end,
    'heroes', case when result.communication_status = 'authorized' then result.heroes else '[]'::jsonb end,
    'publishedAt', coalesce(result.published_at, result.updated_at)
  )
  into heroes_result
  from public.heroes_motors_results result
  where result.user_id = current_user_id
    and result.communication_status in ('authorized', 'refused')
    and (
      is_super_admin
      or (
        result.publication_status = 'published'
        and result.visible
        and exists (
          select 1 from public.app_catalog heroes_app
          where heroes_app.slug = 'test-des-heros'
            and public.can_access_catalog_app(heroes_app.id, current_user_id)
            and public.can_access_resource('app_catalog', heroes_app.id, current_user_id)
        )
      )
    )
  order by coalesce(result.published_at, result.updated_at) desc
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', app.id,
    'slug', app.slug,
    'name', app.name,
    'iconUrl', app.icon_url,
    'destinationUrl', app.destination_url,
    'category', app.category,
    'toolType', app.tool_type,
    'displayTitle', coalesce(app.display_title, app.name),
    'storyTitle', coalesce(app.story_title, app.name),
    'storyImageUrl', coalesce(app.story_image_url, app.icon_url),
    'storyDestinationUrl', coalesce(app.story_destination_url, app.destination_url),
    'postTitle', coalesce(app.post_title, app.name),
    'postImageUrl', coalesce(app.post_image_url, app.icon_url),
    'postDestinationUrl', coalesce(app.post_destination_url, app.destination_url),
    'postDescription', coalesce(app.post_description, app.short_description, ''),
    'postOrder', app.post_order,
    'placementStory', app.placement_story,
    'placementPost', app.placement_post,
    'placementWork', app.placement_work,
    'identityResultMode', app.identity_result_mode,
    'identityImportance', app.identity_importance,
    'resultProvider', app.result_provider
  ) order by app.display_order, app.name), '[]'::jsonb)
  into visible_tools
  from public.app_catalog app
  where app.archived_at is null
    and (
      is_super_admin
      or (
        app.status in ('scheduled', 'published')
        and app.student_enabled
        and (app.student_publish_at is null or app.student_publish_at <= now())
        and exists(
          select 1 from public.app_studio_settings settings
          where settings.singleton and settings.student_tools_enabled
        )
        and public.can_access_catalog_app(app.id, current_user_id)
        and public.can_access_resource('app_catalog', app.id, current_user_id)
      )
    );

  select coalesce(jsonb_agg(jsonb_build_object(
    'app_id', progress.app_id,
    'first_opened_at', progress.first_opened_at,
    'last_opened_at', progress.last_opened_at,
    'reset_at', progress.reset_at
  )), '[]'::jsonb)
  into tool_progress
  from public.app_user_progress progress
  where progress.user_id = current_user_id;

  return jsonb_build_object(
    'dashboard', dashboard_result,
    'lifeLine', life_line_result,
    'heroesMotors', heroes_result,
    'tools', visible_tools,
    'progress', tool_progress
  );
end;
$$;

revoke all on function public.student_identity_feed() from public, anon;
grant execute on function public.student_identity_feed() to authenticated;

comment on function public.student_identity_feed() is
  'Single private read model for the identity gallery, reusing the catalog access policy.';

create or replace function public.student_grace_identity_tool(p_test_key text)
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
  if p_test_key not in ('fruit', 'gifts', 'skills') then
    raise exception 'INVALID_TEST_KEY' using errcode = '22023';
  end if;
  if current_user_id is null or not exists(
    select 1 from public.profiles profile
    where profile.id = current_user_id and not coalesce(profile.deactivated, false)
  ) then
    raise exception 'IDENTITY_ACCESS_DENIED' using errcode = '42501';
  end if;

  is_super_admin := public.is_super_admin(current_user_id);

  select app.* into tool_record
  from public.app_catalog app
  where app.slug in (
      'je-suis-par-la-grace-de-dieu',
      case p_test_key
        when 'fruit' then 'fruit-de-lesprit'
        when 'gifts' then 'dons-spirituels'
        else 'competences-naturelles'
      end
    )
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
        and public.can_access_catalog_app(app.id, current_user_id)
      )
    )
  order by (app.slug = 'je-suis-par-la-grace-de-dieu') asc
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
    'questionnaire_version', assessment.questionnaire_version,
    'scoring_version', assessment.scoring_version,
    'restitution_version', assessment.restitution_version,
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

revoke all on function public.student_grace_identity_tool(text) from public, anon;
grant execute on function public.student_grace_identity_tool(text) to authenticated;

create or replace function public.save_grace_identity_assessment(
  p_test_key text,
  p_answers jsonb,
  p_results jsonb,
  p_questionnaire_version text,
  p_scoring_version text,
  p_restitution_version text,
  p_completed boolean
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
  target_slug text;
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
  target_slug := case p_test_key
    when 'fruit' then 'fruit-de-lesprit'
    when 'gifts' then 'dons-spirituels'
    else 'competences-naturelles'
  end;
  if not public.is_super_admin(current_user_id) and not exists(
    select 1
    from public.app_catalog app
    where app.slug in (target_slug, 'je-suis-par-la-grace-de-dieu')
      and app.archived_at is null
      and app.status in ('scheduled', 'published')
      and app.student_enabled
      and (app.student_publish_at is null or app.student_publish_at <= now())
      and exists(
        select 1 from public.app_studio_settings settings
        where settings.singleton and settings.student_tools_enabled
      )
      and public.can_access_catalog_app(app.id, current_user_id)
  ) then
    raise exception 'IDENTITY_ACCESS_DENIED' using errcode = '42501';
  end if;
  if jsonb_typeof(p_answers) is distinct from 'object'
    or jsonb_typeof(p_results) is distinct from 'object' then
    raise exception 'INVALID_ASSESSMENT' using errcode = '22023';
  end if;

  if nullif(trim(p_questionnaire_version), '') is null
    or nullif(trim(p_scoring_version), '') is null then
    raise exception 'INVALID_ASSESSMENT_VERSION' using errcode = '22023';
  end if;

  insert into public.grace_identity_assessments(
    user_id, test_key, questionnaire_version, scoring_version,
    restitution_version, answers, results, completed_at
  )
  values(
    current_user_id, p_test_key, p_questionnaire_version, p_scoring_version,
    p_restitution_version, p_answers, p_results, case when p_completed then now() else null end
  )
  on conflict(user_id, test_key, questionnaire_version) do update set
    scoring_version = excluded.scoring_version,
    restitution_version = excluded.restitution_version,
    answers = excluded.answers,
    results = excluded.results,
    completed_at = excluded.completed_at,
    updated_at = now()
  returning * into saved;

  return jsonb_build_object(
    'test_key', saved.test_key,
    'questionnaire_version', saved.questionnaire_version,
    'scoring_version', saved.scoring_version,
    'restitution_version', saved.restitution_version,
    'answers', saved.answers,
    'results', saved.results,
    'completed_at', saved.completed_at,
    'updated_at', saved.updated_at
  );
end;
$$;

revoke all on function public.save_grace_identity_assessment(text,jsonb,jsonb,text,text,text,boolean) from public, anon;
grant execute on function public.save_grace_identity_assessment(text,jsonb,jsonb,text,text,text,boolean) to authenticated;

commit;
