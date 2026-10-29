begin;

-- Les responsables historiquement désignés via lead_id conservent leur accès.
insert into public.opportunity_assignments (opportunity_id, user_id, responsibility, created_by)
select id, lead_id, 'manager', created_by
from public.opportunities
where lead_id is not null
on conflict (opportunity_id, user_id)
do update set responsibility = 'manager';

update public.profiles p
set is_projects_training_member = true
where exists (
  select 1
  from public.opportunity_assignments a
  where a.user_id = p.id
);

commit;
