-- Lecture seule. À exécuter sur la source MAPP autonome avant tout export.
begin transaction read only;
select 'participants' as entity, count(*)::bigint as rows from public.participants
union all select 'participant_profiles', count(*) from public.participant_profiles
union all select 'participant_auth_identities', count(*) from public.participant_auth_identities
union all select 'attempts', count(*) from public.attempts
union all select 'attempt_answers', count(*) from public.attempt_answers
union all select 'result_revisions', count(*) from public.result_revisions
union all select 'result_dimension_scores', count(*) from public.result_dimension_scores
order by entity;

select 'attempt_without_participant' as anomaly, count(*)::bigint
from public.attempts a left join public.participants p on p.id = a.participant_id where p.id is null
union all
select 'answer_without_attempt', count(*)
from public.attempt_answers a left join public.attempts t on t.id = a.attempt_id where t.id is null
union all
select 'revision_without_attempt', count(*)
from public.result_revisions r left join public.attempts a on a.id = r.attempt_id where a.id is null;
rollback;
