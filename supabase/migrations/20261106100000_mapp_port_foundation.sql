-- Generated from Profil MAPP 202610070001_foundation.sql.
-- Do not edit this generated file; update the source migration or transformer.
-- Native Ministry integration: all MAPP objects live outside public.
create schema if not exists mapp;
revoke all on schema mapp from public, anon;
grant usage on schema mapp to authenticated, service_role;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists mapp_private;
revoke all on schema mapp_private from public, anon, authenticated;

create type mapp.record_status as enum ('draft', 'published', 'archived');
create type mapp.attempt_status as enum ('in_progress', 'finalizing', 'completed', 'abandoned');
create type mapp.question_context as enum ('natural', 'under_pressure', 'other');
create type mapp.field_requirement as enum ('hidden', 'optional', 'required');
create type mapp.identity_kind as enum ('anonymous', 'email', 'federated', 'other');
create type mapp.consent_status as enum ('accepted', 'declined', 'withdrawn');

create or replace function mapp_private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function mapp_private.prevent_published_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'published' then
    raise exception 'A published version is immutable';
  end if;
  return new;
end;
$$;

create table mapp.participants (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'active' check (status in ('active', 'anonymized', 'merged', 'deleted')),
  merged_into_id uuid references mapp.participants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (merged_into_id is null or merged_into_id <> id)
);

create table mapp.participant_profiles (
  participant_id uuid primary key references mapp.participants(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  job_title text,
  team_label text,
  locale text not null default 'fr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table mapp.participant_auth_identities (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references mapp.participants(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  kind mapp.identity_kind not null,
  issuer text,
  subject text,
  linked_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (auth_user_id)
);

create table mapp.consent_versions (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  version integer not null check (version > 0),
  title text not null,
  body text not null,
  is_development_placeholder boolean not null default false,
  status mapp.record_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (code, version)
);

create table mapp.participant_consents (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references mapp.participants(id) on delete cascade,
  consent_version_id uuid not null references mapp.consent_versions(id),
  status mapp.consent_status not null,
  session_id uuid,
  recorded_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  unique (participant_id, consent_version_id, session_id)
);

create trigger participants_updated_at before update on mapp.participants
for each row execute function mapp_private.set_updated_at();
create trigger participant_profiles_updated_at before update on mapp.participant_profiles
for each row execute function mapp_private.set_updated_at();

create index participant_auth_participant_idx on mapp.participant_auth_identities(participant_id) where revoked_at is null;
create unique index participant_auth_federated_identity_idx on mapp.participant_auth_identities(issuer, subject)
where issuer is not null and subject is not null;

comment on table mapp.participants is 'Personne logique Profil MAPP par MLK, distincte du compte Auth.';
comment on column mapp.participant_profiles.email is 'Coordonnée facultative, jamais utilisée comme identité métier.';
