-- Generated from Profil MAPP 202610080002_pressure_editorial_content.sql.
-- Do not edit this generated file; update the source migration or transformer.
-- Additive preparation only. Applying this migration does not import or publish content.
alter table mapp.restitution_versions drop constraint if exists restitution_versions_content_kind_check;
alter table mapp.restitution_versions
  add constraint restitution_versions_content_kind_check
  check (content_kind in ('profiles', 'combinations', 'interactions', 'biblical', 'pressure'));

alter table mapp.active_restitution_releases drop constraint if exists active_restitution_releases_content_kind_check;
alter table mapp.active_restitution_releases
  add constraint active_restitution_releases_content_kind_check
  check (content_kind in ('profiles', 'combinations', 'interactions', 'biblical', 'pressure'));

-- Versions advance independently for each content library.
alter table mapp.restitution_versions drop constraint if exists restitution_versions_version_key;
alter table mapp.restitution_versions
  add constraint restitution_versions_kind_locale_version_key unique (content_kind, locale, version);

-- A result can retain every editorial release that was actually presented.
create table mapp.result_restitution_bindings (
  result_revision_id uuid not null references mapp.result_revisions(id) on delete cascade,
  content_kind text not null check (content_kind in ('profiles', 'combinations', 'interactions', 'biblical', 'pressure')),
  restitution_version_id uuid not null references mapp.restitution_versions(id) on delete restrict,
  attached_at timestamptz not null default now(),
  primary key (result_revision_id, content_kind)
);

create or replace function mapp_private.prevent_result_restitution_binding_mutation()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'A result restitution binding is immutable';
end;
$$;

create trigger result_restitution_bindings_immutable
before update or delete on mapp.result_restitution_bindings
for each row execute function mapp_private.prevent_result_restitution_binding_mutation();

alter table mapp.result_restitution_bindings enable row level security;
create policy own_result_restitution_bindings_read on mapp.result_restitution_bindings
for select to authenticated using (
  exists (
    select 1 from mapp.result_revisions revision
    join mapp.attempts attempt on attempt.id = revision.attempt_id
    join mapp.participant_auth_identities identity on identity.participant_id = attempt.participant_id
    where revision.id = result_revision_id
      and identity.auth_user_id = auth.uid()
      and identity.revoked_at is null
  )
);
grant select on mapp.result_restitution_bindings to authenticated;

comment on table mapp.result_restitution_bindings is 'Immutable references to each independently versioned editorial release actually presented with a result revision.';
