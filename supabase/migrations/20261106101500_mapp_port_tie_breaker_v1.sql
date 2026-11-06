-- Generated from Profil MAPP 202610100001_tie_breaker_v1.sql.
-- Do not edit this generated file; update the source migration or transformer.
create table mapp.result_tie_breaks (
  result_revision_id uuid primary key references mapp.result_revisions(id) on delete cascade,
  version text not null,
  scope text not null check (scope in ('primary', 'secondary')),
  candidate_codes text[] not null check (cardinality(candidate_codes) between 2 and 4),
  answers jsonb not null,
  selected_code text,
  persistent_codes text[] not null,
  submitted_at timestamptz not null default now()
);

alter table mapp.result_tie_breaks enable row level security;
create policy tie_breaks_read_own on mapp.result_tie_breaks for select to authenticated using (
  exists (
    select 1 from mapp.result_revisions revision
    join mapp.attempts attempt on attempt.id = revision.attempt_id
    where revision.id = result_revision_id and mapp_private.owns_participant(attempt.participant_id)
  )
);
grant select on mapp.result_tie_breaks to authenticated;

create or replace function mapp_private.prevent_tie_break_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'Tie-break submissions are immutable'; end;
$$;
create trigger result_tie_breaks_immutable before update or delete on mapp.result_tie_breaks
for each row execute function mapp_private.prevent_tie_break_mutation();

comment on table mapp.result_tie_breaks is 'Versioned answers to the V10 complementary tie-break questions; natural scores remain immutable.';
