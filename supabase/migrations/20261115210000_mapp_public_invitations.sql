begin;

create table if not exists mapp.invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid references auth.users(id) on delete set null,
  invitation_kind text not null check (invitation_kind in ('student','admin')),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  attempt_id uuid unique references mapp.attempts(id) on delete set null,
  guest_gender text check (guest_gender in ('female','male')),
  guest_first_name text,
  guest_last_name text,
  guest_email text,
  belongs_to_church boolean,
  church_name text,
  consented_at timestamptz,
  consent_version text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz not null default (now() + interval '90 days')
);

alter table mapp.invitations enable row level security;
revoke all on mapp.invitations from public, anon, authenticated;
create index if not exists mapp_invitations_inviter_idx on mapp.invitations(inviter_user_id, created_at desc);
create index if not exists mapp_invitations_attempt_idx on mapp.invitations(attempt_id) where attempt_id is not null;

create or replace function public.mapp_create_personal_invitation(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  created mapp.invitations;
  used_count integer;
begin
  if current_user_id is null or not mapp.current_student_is_eligible() then
    raise exception 'MAPP_ACCESS_DENIED' using errcode='42501';
  end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'MAPP_INVITATION_INVALID' using errcode='22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('mapp-invitations:' || current_user_id::text, 0));
  select count(*) into used_count from mapp.invitations
  where inviter_user_id=current_user_id and invitation_kind='student' and revoked_at is null;
  if used_count >= 3 then
    raise exception 'MAPP_INVITATION_LIMIT' using errcode='P0001';
  end if;
  insert into mapp.invitations(inviter_user_id, invitation_kind, token_hash)
  values(current_user_id, 'student', p_token_hash)
  returning * into created;
  return jsonb_build_object('id', created.id, 'createdAt', created.created_at, 'remaining', 2-used_count);
end;
$$;

create or replace function public.mapp_list_personal_invitations()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with owned as (
    select invitation.id, invitation.created_at, invitation.started_at,
      invitation.guest_first_name, invitation.guest_last_name,
      invitation.guest_email, invitation.attempt_id,
      attempt.status as attempt_status, attempt.completed_at
    from mapp.invitations invitation
    left join mapp.attempts attempt on attempt.id=invitation.attempt_id
    where invitation.inviter_user_id=(select auth.uid())
      and invitation.invitation_kind='student' and invitation.revoked_at is null
    order by invitation.created_at desc
  )
  select jsonb_build_object(
    'used', count(*),
    'remaining', greatest(0, 3-count(*)),
    'invitations', coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'createdAt', created_at, 'startedAt', started_at,
      'guestName', nullif(trim(concat_ws(' ', guest_first_name, guest_last_name)), ''),
      'guestEmail', guest_email,
      'status', case when completed_at is not null then 'completed'
                     when attempt_id is not null then 'started' else 'created' end,
      'completedAt', completed_at
    ) order by created_at desc), '[]'::jsonb)
  ) from owned
$$;

create or replace function mapp.invitation_public_summary(p_token_hash text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', invitation.id,
    'inviterFirstName', case when invitation.invitation_kind='admin' then 'Ministry School'
      else split_part(trim(coalesce(profile.full_name, 'Un étudiant')), ' ', 1) end,
    'kind', invitation.invitation_kind,
    'available', invitation.revoked_at is null and invitation.expires_at > now() and invitation.attempt_id is null
  )
  from mapp.invitations invitation
  left join public.profiles profile on profile.id=invitation.inviter_user_id
  where invitation.token_hash=p_token_hash
    and invitation.revoked_at is null and invitation.expires_at > now()
$$;

create or replace function mapp.start_invited_guest(
  p_invitation_hash text,
  p_gender text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_belongs_to_church boolean,
  p_church_name text,
  p_consent_version text,
  p_access_hash text,
  p_recovery_hash text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation mapp.invitations;
  target_session mapp.assessment_sessions;
  target_participant uuid;
  target_attempt mapp.attempts;
  normalized_first_name text := trim(p_first_name);
  normalized_last_name text := trim(p_last_name);
  normalized_email text := lower(trim(p_email));
  normalized_church text := nullif(trim(coalesce(p_church_name,'')), '');
begin
  if p_gender not in ('female','male')
    or length(normalized_first_name) not between 2 and 80
    or length(normalized_last_name) not between 2 and 80
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or length(normalized_email)>254
    or (p_belongs_to_church and normalized_church is null)
    or length(coalesce(p_consent_version,''))<1
    or p_access_hash !~ '^[0-9a-f]{64}$'
    or p_recovery_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'MAPP_GUEST_INVALID' using errcode='22023';
  end if;
  select * into invitation from mapp.invitations
  where token_hash=p_invitation_hash for update;
  if invitation.id is null or invitation.revoked_at is not null
    or invitation.expires_at<=now() or invitation.attempt_id is not null then
    raise exception 'MAPP_INVITATION_UNAVAILABLE' using errcode='42501';
  end if;

  select session.* into target_session
  from mapp.native_settings settings
  join mapp.assessment_sessions session on session.id=settings.assessment_session_id
  join mapp.scoring_versions scoring on scoring.id=session.scoring_version_id
  where settings.singleton and settings.enabled and session.status='published'
    and scoring.code='profil-mapp-hybrid-44-v1.0.0'
    and (session.starts_at is null or session.starts_at<=now())
    and (session.ends_at is null or session.ends_at>=now());
  if target_session.id is null then raise exception 'MAPP_QUESTIONNAIRE_UNAVAILABLE' using errcode='P0002'; end if;

  insert into mapp.participants default values returning id into target_participant;
  insert into mapp.participant_profiles(participant_id,first_name,last_name,email)
  values(target_participant,normalized_first_name,normalized_last_name,normalized_email);
  insert into mapp.attempts(participant_id,session_id,questionnaire_version_id,scoring_version_id,source,order_seed)
  values(target_participant,target_session.id,target_session.questionnaire_version_id,target_session.scoring_version_id,
    case when invitation.invitation_kind='admin' then 'ministry-admin-invitation' else 'ministry-student-invitation' end,
    gen_random_uuid()::text) returning * into target_attempt;
  insert into mapp.attempt_question_order(attempt_id,question_id,position)
  select target_attempt.id,question.id,row_number() over(order by question.editorial_position,question.id)::integer
  from mapp.questions question where question.questionnaire_version_id=target_session.questionnaire_version_id;
  insert into mapp.guest_attempt_access(attempt_id,participant_id,email,token_hash,recovery_hash)
  values(target_attempt.id,target_participant,normalized_email,p_access_hash,p_recovery_hash);
  update mapp.invitations set attempt_id=target_attempt.id, guest_gender=p_gender,
    guest_first_name=normalized_first_name, guest_last_name=normalized_last_name,
    guest_email=normalized_email, belongs_to_church=p_belongs_to_church,
    church_name=case when p_belongs_to_church then normalized_church else null end,
    consented_at=now(), consent_version=p_consent_version, started_at=now()
  where id=invitation.id;
  insert into mapp.attempt_events(attempt_id,event_type,metadata)
  values(target_attempt.id,'started',jsonb_build_object('source','invitation','invitationId',invitation.id));
  return mapp.guest_questionnaire_bundle(target_attempt.id);
end;
$$;

create or replace function mapp.submit_invited_guest_tie_break(
  p_attempt_id uuid,
  p_token_hash text,
  p_result_revision_id uuid,
  p_answers jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_codes text[];
  tie_scope text;
  persistent_codes text[];
  selected_code text;
  maximum_votes integer;
begin
  if not mapp.guest_access_allowed(p_attempt_id, p_token_hash) or not exists (
    select 1 from mapp.result_revisions revision
    join mapp.attempts attempt on attempt.id=revision.attempt_id
    where revision.id=p_result_revision_id and attempt.id=p_attempt_id and attempt.status='completed'
  ) then
    raise exception 'MAPP_RESULT_UNAVAILABLE' using errcode='42501';
  end if;

  select ranking.primary_candidates, 'primary'
    into candidate_codes, tie_scope
  from mapp.result_rankings ranking
  where ranking.result_revision_id=p_result_revision_id and ranking.context='natural'
    and ranking.tie_break_required and cardinality(ranking.primary_candidates)>1;

  if coalesce(cardinality(candidate_codes),0)<2 then
    select ranking.secondary_candidates, 'secondary'
      into candidate_codes, tie_scope
    from mapp.result_rankings ranking
    where ranking.result_revision_id=p_result_revision_id and ranking.context='natural'
      and ranking.tie_break_required and cardinality(ranking.secondary_candidates)>1;
  end if;

  if coalesce(cardinality(candidate_codes),0)<2 then
    return mapp.guest_result_bundle(p_attempt_id,p_token_hash);
  end if;
  if jsonb_typeof(p_answers)<>'array' or jsonb_array_length(p_answers)<>3 or (
    select count(distinct answer->>'questionId')<>3
      or bool_or((answer->>'questionId') not in ('tie-01','tie-02','tie-03'))
      or bool_or(not ((answer->>'selectedCode')=any(candidate_codes)))
    from jsonb_array_elements(p_answers) answer
  ) then raise exception 'MAPP_TIE_BREAK_INVALID' using errcode='22023'; end if;

  with votes as (
    select candidate,count(answer.*)::integer vote_count
    from unnest(candidate_codes) candidate
    left join jsonb_array_elements(p_answers) answer on answer->>'selectedCode'=candidate
    group by candidate
  ) select max(vote_count) into maximum_votes from votes;
  with votes as (
    select candidate,count(answer.*)::integer vote_count
    from unnest(candidate_codes) candidate
    left join jsonb_array_elements(p_answers) answer on answer->>'selectedCode'=candidate
    group by candidate
  ) select array_agg(candidate order by array_position(candidate_codes,candidate))
    into persistent_codes from votes where vote_count=maximum_votes;
  selected_code:=case when cardinality(persistent_codes)=1 then persistent_codes[1] else null end;

  insert into mapp.result_tie_breaks(result_revision_id,version,scope,candidate_codes,answers,selected_code,persistent_codes)
  values(p_result_revision_id,'mapp-v10-tie-break-v1',tie_scope,candidate_codes,p_answers,selected_code,persistent_codes)
  on conflict(result_revision_id) do update set
    version=excluded.version,scope=excluded.scope,candidate_codes=excluded.candidate_codes,
    answers=excluded.answers,selected_code=excluded.selected_code,persistent_codes=excluded.persistent_codes;
  return mapp.guest_result_bundle(p_attempt_id,p_token_hash);
end;
$$;

create or replace function mapp.recover_invited_guest(
  p_invitation_hash text,
  p_email text,
  p_recovery_hash text,
  p_new_access_hash text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  recovered record;
begin
  if p_new_access_hash !~ '^[0-9a-f]{64}$' or p_recovery_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'MAPP_RECOVERY_INVALID' using errcode='22023';
  end if;

  select invitation.attempt_id, attempt.status
    into recovered
  from mapp.invitations invitation
  join mapp.attempts attempt on attempt.id=invitation.attempt_id
  join mapp.guest_attempt_access access on access.attempt_id=attempt.id
  where invitation.token_hash=p_invitation_hash
    and invitation.revoked_at is null
    and lower(invitation.guest_email)=lower(trim(p_email))
    and access.recovery_hash=p_recovery_hash
  for update of access;

  if recovered.attempt_id is null then
    raise exception 'MAPP_RECOVERY_INVALID' using errcode='42501';
  end if;

  update mapp.guest_attempt_access
    set token_hash=p_new_access_hash, last_accessed_at=now(), expires_at=greatest(expires_at, now() + interval '30 days')
  where attempt_id=recovered.attempt_id;

  return jsonb_build_object('attemptId', recovered.attempt_id, 'status', recovered.status);
end;
$$;

create or replace function mapp_private.sync_official_ranking_after_tie_break()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_short text := case new.selected_code
    when 'conquerant' then 'D' when 'communiquant' then 'I'
    when 'facilitateur' then 'S' when 'analyste' then 'C'
    else new.selected_code end;
  ranking mapp.result_rankings;
  next_order text[];
begin
  if selected_short is null or selected_short not in ('D','I','S','C') then return new; end if;
  select * into ranking from mapp.result_rankings
  where result_revision_id=new.result_revision_id and context='natural'
  for update;
  if ranking.id is null then return new; end if;

  if new.scope='primary' then
    next_order:=array_prepend(selected_short, array_remove(ranking.initial_order, selected_short));
    update mapp.result_rankings set resolved_order=next_order,
      primary_code=next_order[1], secondary_code=next_order[2], tie_break_required=false
    where id=ranking.id;
  else
    next_order:=array_prepend(ranking.primary_code,
      array_prepend(selected_short, array_remove(array_remove(ranking.initial_order, ranking.primary_code), selected_short)));
    update mapp.result_rankings set resolved_order=next_order,
      secondary_code=selected_short, tie_break_required=false
    where id=ranking.id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_official_ranking_after_tie_break on mapp.result_tie_breaks;
create trigger sync_official_ranking_after_tie_break
after insert on mapp.result_tie_breaks
for each row execute function mapp_private.sync_official_ranking_after_tie_break();

update mapp.result_rankings ranking set
  primary_code=case tie_break.selected_code
    when 'conquerant' then 'D' when 'communiquant' then 'I'
    when 'facilitateur' then 'S' when 'analyste' then 'C' else tie_break.selected_code end,
  secondary_code=(array_remove(ranking.initial_order, case tie_break.selected_code
    when 'conquerant' then 'D' when 'communiquant' then 'I'
    when 'facilitateur' then 'S' when 'analyste' then 'C' else tie_break.selected_code end))[1],
  resolved_order=array_prepend(
    case tie_break.selected_code when 'conquerant' then 'D' when 'communiquant' then 'I'
      when 'facilitateur' then 'S' when 'analyste' then 'C' else tie_break.selected_code end,
    array_remove(ranking.initial_order, case tie_break.selected_code
      when 'conquerant' then 'D' when 'communiquant' then 'I'
      when 'facilitateur' then 'S' when 'analyste' then 'C' else tie_break.selected_code end)),
  tie_break_required=false
from mapp.result_tie_breaks tie_break
where tie_break.result_revision_id=ranking.result_revision_id
  and tie_break.scope='primary' and tie_break.selected_code is not null
  and ranking.context='natural' and ranking.primary_code is null;

update mapp.result_rankings ranking set
  secondary_code=case tie_break.selected_code
    when 'conquerant' then 'D' when 'communiquant' then 'I'
    when 'facilitateur' then 'S' when 'analyste' then 'C' else tie_break.selected_code end,
  tie_break_required=false
from mapp.result_tie_breaks tie_break
where tie_break.result_revision_id=ranking.result_revision_id
  and tie_break.scope='secondary' and tie_break.selected_code is not null
  and ranking.context='natural' and ranking.secondary_code is null;

revoke all on function public.mapp_create_personal_invitation(text), public.mapp_list_personal_invitations() from public, anon;
grant execute on function public.mapp_create_personal_invitation(text), public.mapp_list_personal_invitations() to authenticated;
revoke all on function mapp.invitation_public_summary(text), mapp.start_invited_guest(text,text,text,text,text,boolean,text,text,text,text), mapp.submit_invited_guest_tie_break(uuid,text,uuid,jsonb), mapp.recover_invited_guest(text,text,text,text) from public, anon, authenticated;
grant execute on function mapp.invitation_public_summary(text), mapp.start_invited_guest(text,text,text,text,text,boolean,text,text,text,text), mapp.submit_invited_guest_tie_break(uuid,text,uuid,jsonb), mapp.recover_invited_guest(text,text,text,text) to service_role;

comment on table mapp.invitations is 'Invitations MAPP personnelles (quota atomique de trois) et administrateur, sans jeton stocké en clair.';

commit;
