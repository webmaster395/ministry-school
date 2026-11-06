begin;

-- Évolution additive de la lecture consolidée. Aucune nouvelle requête n'est
-- nécessaire pour afficher le libellé Étudiant / Étudiante : la donnée déjà
-- présente dans profiles est incluse dans le même document JSON privé.
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
  if current_user_id is null then raise exception 'IDENTITY_ACCESS_DENIED' using errcode = '42501'; end if;
  select profile.* into current_profile from public.profiles profile
  where profile.id = current_user_id and not coalesce(profile.deactivated, false);
  if current_profile.id is null then raise exception 'IDENTITY_ACCESS_DENIED' using errcode = '42501'; end if;

  select identity_link.participant_id into v_participant_id
  from mapp.participant_auth_identities identity_link
  where identity_link.auth_user_id = current_user_id and identity_link.revoked_at is null limit 1;

  if v_participant_id is not null then
    select count(*)::integer into mapp_completed from mapp.attempts attempt
    where attempt.participant_id = v_participant_id and attempt.status = 'completed';
    select coalesce(jsonb_agg(item.payload order by item.completed_at desc), '[]'::jsonb) into mapp_results
    from (select attempt.completed_at, jsonb_build_object('kind','mapp','attemptId',attempt.id,'completedAt',attempt.completed_at,'primaryCode',ranking.primary_code,'secondaryCode',ranking.secondary_code,'tieBreakRequired',ranking.tie_break_required,'resultRevisionId',revision.id) payload
      from mapp.attempts attempt join lateral (select result.id from mapp.result_revisions result where result.attempt_id=attempt.id order by result.revision desc limit 1) revision on true
      left join mapp.result_rankings ranking on ranking.result_revision_id=revision.id and ranking.context='natural'
      where attempt.participant_id=v_participant_id and attempt.status='completed') item;
  end if;

  select count(*)::integer, coalesce(jsonb_agg(jsonb_build_object('kind',assessment.test_key,'completedAt',assessment.completed_at,'results',assessment.results) order by assessment.completed_at desc),'[]'::jsonb)
  into grace_completed, grace_results from public.grace_identity_assessments assessment
  where assessment.user_id=current_user_id and assessment.completed_at is not null;

  return jsonb_build_object(
    'profile',jsonb_build_object('firstName',split_part(trim(coalesce(current_profile.full_name,'')),' ',1),'memberSince',current_profile.created_at,'certified',false,'gender',current_profile.gender),
    'metrics',jsonb_build_object('studentCount',(select count(*)::integer from public.profiles profile where profile.role='student' and profile.email_confirmed and not coalesce(profile.deactivated,false)),'completedTests',mapp_completed+grace_completed),
    'identityResults',mapp_results||grace_results,'financeResults','[]'::jsonb,'recommendations','[]'::jsonb
  );
end;
$$;

revoke all on function public.student_identity_dashboard() from public, anon;
grant execute on function public.student_identity_dashboard() to authenticated;

commit;
