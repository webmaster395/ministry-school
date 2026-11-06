begin;

create index if not exists mapp_participant_profiles_email_lower_idx
  on mapp.participant_profiles (lower(email));

create or replace function mapp.admin_list_attempts_page(
  p_offset integer default 0,
  p_limit integer default 50,
  p_search text default null,
  p_status text default null
) returns table (
  attempt_id uuid,
  participant_id uuid,
  first_name text,
  last_name text,
  email text,
  attempt_status text,
  started_at timestamptz,
  completed_at timestamptz,
  primary_code text,
  secondary_code text,
  pressure_code text,
  total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    attempt.id,
    attempt.participant_id,
    profile.first_name,
    profile.last_name,
    profile.email,
    attempt.status::text,
    attempt.started_at,
    attempt.completed_at,
    natural_ranking.primary_code,
    natural_ranking.secondary_code,
    pressure_ranking.primary_code,
    count(*) over()
  from mapp.attempts attempt
  left join mapp.participant_profiles profile on profile.participant_id = attempt.participant_id
  left join lateral (
    select revision.id
    from mapp.result_revisions revision
    where revision.attempt_id = attempt.id
    order by revision.revision desc
    limit 1
  ) latest on true
  left join mapp.result_rankings natural_ranking
    on natural_ranking.result_revision_id = latest.id and natural_ranking.context = 'natural'
  left join mapp.result_rankings pressure_ranking
    on pressure_ranking.result_revision_id = latest.id and pressure_ranking.context = 'under_pressure'
  where attempt.deleted_at is null
    and (nullif(trim(p_status), '') is null or attempt.status::text = trim(p_status))
    and (
      nullif(trim(p_search), '') is null
      or concat_ws(' ', profile.first_name, profile.last_name) ilike '%' || trim(p_search) || '%'
      or profile.email ilike '%' || trim(p_search) || '%'
    )
  order by attempt.started_at desc
  offset greatest(coalesce(p_offset, 0), 0)
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

revoke all on function mapp.admin_list_attempts_page(integer,integer,text,text)
  from public, anon, authenticated;
grant execute on function mapp.admin_list_attempts_page(integer,integer,text,text)
  to service_role;

comment on function mapp.admin_list_attempts_page(integer,integer,text,text) is
  'Returns one lightweight, paginated administration row per visible MAPP attempt.';

commit;
