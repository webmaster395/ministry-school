-- Generated from Profil MAPP 202611060001_admin_archive_attempts.sql.
-- Do not edit this generated file; update the source migration or transformer.
alter table mapp.attempts
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by text;

create index if not exists attempts_visible_started_at_idx
on mapp.attempts(started_at desc)
where deleted_at is null;

create or replace function mapp.admin_archive_attempts(target_ids uuid[], actor text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare archived_count integer;
begin
  if coalesce(array_length(target_ids, 1), 0) = 0 then return 0; end if;

  update mapp.attempts
  set deleted_at = now(),
      deleted_by = nullif(trim(actor), ''),
      status = case when status in ('in_progress', 'finalizing') then 'abandoned'::mapp.attempt_status else status end
  where id = any(target_ids)
    and deleted_at is null;

  get diagnostics archived_count = row_count;
  return archived_count;
end;
$$;

revoke all on function mapp.admin_archive_attempts(uuid[], text) from public, anon, authenticated;
grant execute on function mapp.admin_archive_attempts(uuid[], text) to service_role;

comment on function mapp.admin_archive_attempts(uuid[], text) is
  'Archives selected attempts atomically so they no longer appear in administration or aggregate statistics.';
