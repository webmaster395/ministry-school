begin;

-- Les évaluations déjà enregistrées restent intactes. Une nouvelle version du
-- même test crée désormais une ligne distincte au lieu d'écraser l'historique.
alter table public.grace_identity_assessments
  add column if not exists questionnaire_version text not null default 'legacy-unversioned',
  add column if not exists scoring_version text not null default 'legacy-unversioned',
  add column if not exists restitution_version text;

update public.grace_identity_assessments
set questionnaire_version = case test_key
      when 'fruit' then 'fruit-spirit-v1-9'
      when 'gifts' then 'spiritual-gifts-current'
      when 'skills' then 'natural-skills-current'
      else questionnaire_version
    end,
    scoring_version = case test_key
      when 'fruit' then 'fruit-spirit-v1-direct'
      when 'gifts' then 'spiritual-gifts-current'
      when 'skills' then 'natural-skills-current'
      else scoring_version
    end,
    restitution_version = case test_key
      when 'fruit' then 'fruit-spirit-v1-card'
      when 'gifts' then 'spiritual-gifts-current'
      when 'skills' then 'natural-skills-current'
      else restitution_version
    end
where questionnaire_version = 'legacy-unversioned';

alter table public.grace_identity_assessments
  drop constraint if exists grace_identity_assessments_user_id_test_key_key;

alter table public.grace_identity_assessments
  add constraint grace_identity_assessments_user_test_questionnaire_key
  unique(user_id, test_key, questionnaire_version);

create index if not exists grace_identity_assessments_version_idx
  on public.grace_identity_assessments(test_key, questionnaire_version, completed_at desc);

comment on column public.grace_identity_assessments.questionnaire_version is
  'Immutable questionnaire identifier. Historical rows are never recomputed against a newer questionnaire.';
comment on column public.grace_identity_assessments.scoring_version is
  'Scoring rules used to calculate the stored results JSON.';
comment on column public.grace_identity_assessments.restitution_version is
  'Editorial restitution version; nullable while the V2 texts remain unpublished.';

-- Mon identité expose uniquement le résultat terminé le plus récent de chaque
-- outil, tout en laissant toutes les versions historiques conservées en base.
create or replace function public.student_identity_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_profile public.profiles;
  v_participant_id uuid;
  mapp_results jsonb := '[]'::jsonb;
  grace_results jsonb := '[]'::jsonb;
  mapp_completed integer := 0;
  grace_completed integer := 0;
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

  select identity_link.participant_id into v_participant_id
  from mapp.participant_auth_identities identity_link
  where identity_link.auth_user_id = current_user_id
    and identity_link.revoked_at is null
  limit 1;

  if v_participant_id is not null then
    select count(*)::integer into mapp_completed
    from mapp.attempts attempt
    where attempt.participant_id = v_participant_id
      and attempt.status = 'completed';

    select coalesce(jsonb_agg(item.payload order by item.completed_at desc), '[]'::jsonb)
    into mapp_results
    from (
      select attempt.completed_at,
        jsonb_build_object(
          'kind', 'mapp',
          'attemptId', attempt.id,
          'completedAt', attempt.completed_at,
          'primaryCode', ranking.primary_code,
          'secondaryCode', ranking.secondary_code,
          'tieBreakRequired', ranking.tie_break_required,
          'resultRevisionId', revision.id
        ) as payload
      from mapp.attempts attempt
      join lateral (
        select result.id
        from mapp.result_revisions result
        where result.attempt_id = attempt.id
        order by result.revision desc
        limit 1
      ) revision on true
      left join mapp.result_rankings ranking
        on ranking.result_revision_id = revision.id and ranking.context = 'natural'
      where attempt.participant_id = v_participant_id
        and attempt.status = 'completed'
    ) item;
  end if;

  select count(*)::integer,
    coalesce(jsonb_agg(jsonb_build_object(
      'kind', assessment.test_key,
      'completedAt', assessment.completed_at,
      'results', assessment.results,
      'questionnaireVersion', assessment.questionnaire_version,
      'scoringVersion', assessment.scoring_version,
      'restitutionVersion', assessment.restitution_version
    ) order by assessment.completed_at desc), '[]'::jsonb)
  into grace_completed, grace_results
  from (
    select distinct on (item.test_key) item.*
    from public.grace_identity_assessments item
    where item.user_id = current_user_id
      and item.completed_at is not null
    order by item.test_key, item.completed_at desc, item.updated_at desc
  ) assessment;

  return jsonb_build_object(
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
      ),
      'completedTests', mapp_completed + grace_completed
    ),
    'identityResults', mapp_results || grace_results,
    'financeResults', '[]'::jsonb,
    'recommendations', '[]'::jsonb
  );
end;
$$;

revoke all on function public.student_identity_dashboard() from public, anon;
grant execute on function public.student_identity_dashboard() to authenticated;

comment on function public.student_identity_dashboard() is
  'Consolidated private identity dashboard; exposes only the latest completed version of each Grace identity assessment.';

commit;
