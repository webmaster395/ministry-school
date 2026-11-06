-- Lecture seule. Les valeurs attendues sont renseignées depuis le manifeste d'export approuvé.
begin transaction read only;
select 'participants' as entity, count(*)::bigint as rows from mapp.participants
union all select 'participant_profiles', count(*) from mapp.participant_profiles
union all select 'attempts', count(*) from mapp.attempts
union all select 'attempt_answers', count(*) from mapp.attempt_answers
union all select 'result_revisions', count(*) from mapp.result_revisions
union all select 'result_dimension_scores', count(*) from mapp.result_dimension_scores
order by entity;

select 'attempt_without_participant' as anomaly, count(*)::bigint
from mapp.attempts a left join mapp.participants p on p.id = a.participant_id where p.id is null
union all
select 'answer_without_attempt', count(*)
from mapp.attempt_answers a left join mapp.attempts t on t.id = a.attempt_id where t.id is null
union all
select 'revision_without_attempt', count(*)
from mapp.result_revisions r left join mapp.attempts a on a.id = r.attempt_id where a.id is null
union all
select 'active_identity_without_ministry_auth', count(*)
from mapp.participant_auth_identities i left join auth.users u on u.id = i.auth_user_id
where i.revoked_at is null and u.id is null;
rollback;
