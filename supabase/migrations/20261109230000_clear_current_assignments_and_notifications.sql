-- Retire les devoirs actuellement publiés et leurs notifications associées.
-- Une copie technique est conservée pour permettre une restauration ciblée.

create table if not exists public.maintenance_cleanup_backups (
  batch_key text not null,
  entity_type text not null,
  entity_key text not null,
  payload jsonb not null,
  archived_at timestamptz not null default now(),
  primary key (batch_key, entity_type, entity_key)
);

alter table public.maintenance_cleanup_backups enable row level security;
revoke all on table public.maintenance_cleanup_backups from anon, authenticated;

do $$
declare
  v_batch constant text := 'clear-current-assignments-2026-11-09';
begin
  create temporary table assignment_cleanup_ids on commit drop as
    -- Correspond exactement au filtre utilisé par l'espace étudiant.
    -- Les devoirs planifiés pour une date future restent intacts.
    select id
    from public.assignments
    where visible_at is not null
      and visible_at <= now();

  insert into public.maintenance_cleanup_backups(batch_key, entity_type, entity_key, payload)
  select v_batch, 'assignment', assignment.id::text, to_jsonb(assignment)
  from public.assignments assignment
  on conflict do nothing;

  insert into public.maintenance_cleanup_backups(batch_key, entity_type, entity_key, payload)
  select v_batch, 'assignment_step', step.id::text, to_jsonb(step)
  from public.assignment_steps step
  join assignment_cleanup_ids selected on selected.id = step.assignment_id
  on conflict do nothing;

  insert into public.maintenance_cleanup_backups(batch_key, entity_type, entity_key, payload)
  select v_batch, 'assignment_completion', completion.assignment_id::text || ':' || completion.user_id::text, to_jsonb(completion)
  from public.assignment_completions completion
  join assignment_cleanup_ids selected on selected.id = completion.assignment_id
  on conflict do nothing;

  insert into public.maintenance_cleanup_backups(batch_key, entity_type, entity_key, payload)
  select v_batch, 'assignment_step_completion', completion.step_id::text || ':' || completion.user_id::text, to_jsonb(completion)
  from public.assignment_step_completions completion
  join assignment_cleanup_ids selected on selected.id = completion.assignment_id
  on conflict do nothing;

  insert into public.maintenance_cleanup_backups(batch_key, entity_type, entity_key, payload)
  select v_batch, 'notification_event', event.id::text, to_jsonb(event)
  from public.notification_events event
  where event.resource_type in ('assignment', 'assignment_deadline')
     or event.resource_id in (select id from assignment_cleanup_ids)
  on conflict do nothing;

  insert into public.maintenance_cleanup_backups(batch_key, entity_type, entity_key, payload)
  select v_batch, 'announcement', announcement.id::text, to_jsonb(announcement)
  from public.announcements announcement
  where announcement.target_type in ('assignment', 'assignment_deadline')
     or announcement.target_id in (select id from assignment_cleanup_ids)
  on conflict do nothing;

  delete from public.announcements announcement
  where announcement.target_type in ('assignment', 'assignment_deadline')
     or announcement.target_id in (select id from assignment_cleanup_ids);

  delete from public.notification_events event
  where event.resource_type in ('assignment', 'assignment_deadline')
     or event.resource_id in (select id from assignment_cleanup_ids);

  -- Les étapes et les validations personnelles sont supprimées en cascade.
  delete from public.assignments
  where id in (select id from assignment_cleanup_ids);
end
$$;

