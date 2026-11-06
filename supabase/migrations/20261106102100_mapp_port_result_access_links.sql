-- Generated from Profil MAPP 202610210001_result_access_links.sql.
-- Do not edit this generated file; update the source migration or transformer.
create table mapp.result_access_links (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references mapp.attempts(id) on delete cascade,
  result_revision_id uuid references mapp.result_revisions(id) on delete cascade,
  token_hash text not null unique,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_accessed_at timestamptz
);

create index result_access_links_attempt_idx
on mapp.result_access_links(attempt_id, created_at desc)
where revoked_at is null;

alter table mapp.result_access_links enable row level security;
revoke all on mapp.result_access_links from public, anon, authenticated;

comment on table mapp.result_access_links is
  'Revocable, capability-based links for completed results. Only SHA-256 token digests are stored.';
