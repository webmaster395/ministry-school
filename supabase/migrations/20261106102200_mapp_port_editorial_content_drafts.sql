-- Generated from Profil MAPP 202611050001_editorial_content_drafts.sql.
-- Do not edit this generated file; update the source migration or transformer.
create table if not exists mapp.editorial_content_drafts (
  id uuid primary key default gen_random_uuid(),
  editorial_id text not null,
  source_version text not null,
  sections jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  revision integer not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (editorial_id, revision)
);

alter table mapp.editorial_content_drafts enable row level security;
revoke all on table mapp.editorial_content_drafts from anon, authenticated;

create index if not exists editorial_content_drafts_lookup_idx
  on mapp.editorial_content_drafts (editorial_id, revision desc);
