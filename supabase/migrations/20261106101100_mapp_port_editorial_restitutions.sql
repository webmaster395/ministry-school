-- Generated from Profil MAPP 202610080001_editorial_restitutions.sql.
-- Do not edit this generated file; update the source migration or transformer.
create type mapp.editorial_status as enum ('empty', 'draft', 'review', 'approved', 'blocked');

alter table mapp.restitution_versions
  add column schema_version text not null default 'profile-content-v1',
  add column locale text not null default 'fr-FR',
  add column content_kind text not null default 'profiles'
    check (content_kind in ('profiles', 'combinations', 'interactions', 'biblical')),
  add column content_hash text,
  add column publication_notes text,
  add column manifest_metadata jsonb not null default '{}'::jsonb,
  add column supersedes_version_id uuid references mapp.restitution_versions(id) on delete restrict;

alter table mapp.restitution_versions
  add constraint restitution_versions_hash_format check (content_hash is null or content_hash ~ '^[0-9a-f]{64}$');

create index restitution_versions_kind_locale_version_idx
  on mapp.restitution_versions(content_kind, locale, version);

create table mapp.profile_interactions (
  id uuid primary key default gen_random_uuid(),
  source_profile_id uuid not null references mapp.profiles(id) on delete restrict,
  target_profile_id uuid not null references mapp.profiles(id) on delete restrict,
  code text not null unique,
  unique (source_profile_id, target_profile_id)
);

insert into mapp.profile_combinations(primary_profile_id, secondary_profile_id, code)
select source.id, target.id, source.code || '-to-' || target.code
from mapp.profiles source cross join mapp.profiles target
where source.id <> target.id
on conflict (primary_profile_id, secondary_profile_id) do nothing;

insert into mapp.profile_interactions(source_profile_id, target_profile_id, code)
select source.id, target.id, source.code || '-to-' || target.code
from mapp.profiles source cross join mapp.profiles target
on conflict (source_profile_id, target_profile_id) do nothing;

create table mapp.restitution_sections (
  id uuid primary key default gen_random_uuid(),
  restitution_version_id uuid not null references mapp.restitution_versions(id) on delete cascade,
  target_type text not null check (target_type in ('profile', 'combination', 'interaction', 'result', 'generic')),
  target_id uuid,
  section_key text not null,
  publication_status mapp.editorial_status not null default 'empty',
  title text not null,
  summary text,
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  unique (restitution_version_id, target_type, target_id, section_key),
  check (section_key ~ '^[a-z][a-z0-9_]*$')
);

alter table mapp.restitution_blocks
  add column section_id uuid references mapp.restitution_sections(id) on delete cascade,
  add column stable_id text,
  add column block_type text check (block_type in ('prose', 'list', 'highlight', 'recommendations', 'reflection_questions')),
  add column payload jsonb not null default '{}'::jsonb;

create unique index restitution_blocks_section_stable_key
  on mapp.restitution_blocks(section_id, stable_id)
  where section_id is not null;

create table mapp.active_restitution_releases (
  content_kind text not null check (content_kind in ('profiles', 'combinations', 'interactions', 'biblical')),
  locale text not null,
  restitution_version_id uuid not null references mapp.restitution_versions(id) on delete restrict,
  activated_at timestamptz not null default now(),
  primary key (content_kind, locale)
);

create or replace function mapp_private.prevent_published_restitution_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'published' then raise exception 'A published restitution version is immutable'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function mapp_private.prevent_published_restitution_child_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare parent_status mapp.record_status;
declare version_id uuid;
begin
  if tg_table_name = 'restitution_sections' then
    version_id := coalesce(new.restitution_version_id, old.restitution_version_id);
  else
    select restitution_version_id into version_id from mapp.restitution_sections
    where id = coalesce(new.section_id, old.section_id);
    if version_id is null then version_id := coalesce(new.restitution_version_id, old.restitution_version_id); end if;
  end if;
  select status into parent_status from mapp.restitution_versions where id = version_id;
  if parent_status = 'published' then raise exception 'Children of a published restitution are immutable'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger restitution_versions_immutable before update or delete on mapp.restitution_versions
for each row execute function mapp_private.prevent_published_restitution_mutation();
create trigger restitution_sections_immutable before insert or update or delete on mapp.restitution_sections
for each row execute function mapp_private.prevent_published_restitution_child_mutation();
create trigger restitution_blocks_immutable before insert or update or delete on mapp.restitution_blocks
for each row execute function mapp_private.prevent_published_restitution_child_mutation();

create or replace function mapp.publish_restitution_version(target_version uuid, make_active boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare version_row mapp.restitution_versions;
begin
  select * into version_row from mapp.restitution_versions where id = target_version for update;
  if version_row.id is null then raise exception 'Restitution version not found'; end if;
  if version_row.status = 'published' then return; end if;
  if version_row.content_hash is null then raise exception 'A validated content hash is required'; end if;
  if not exists (
    select 1 from mapp.restitution_sections
    where restitution_version_id = target_version and publication_status = 'approved'
  ) then raise exception 'At least one approved section is required'; end if;
  if exists (
    select 1 from mapp.restitution_sections section
    join mapp.restitution_blocks block on block.section_id = section.id
    where section.restitution_version_id = target_version
      and (block.stable_id is null or block.block_type is null or block.payload = '{}'::jsonb)
  ) then raise exception 'Every editorial block must be typed and validated'; end if;

  update mapp.restitution_versions set status = 'published', published_at = now() where id = target_version;
  if make_active then
    insert into mapp.active_restitution_releases(content_kind, locale, restitution_version_id)
    values (version_row.content_kind, version_row.locale, target_version)
    on conflict (content_kind, locale) do update
      set restitution_version_id = excluded.restitution_version_id, activated_at = now();
  end if;
end;
$$;

create or replace function mapp_private.attach_active_restitution()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.restitution_version_id is null then
    select release.restitution_version_id into new.restitution_version_id
    from mapp.active_restitution_releases release
    join mapp.restitution_versions version on version.id = release.restitution_version_id
    where release.content_kind = 'profiles' and release.locale = 'fr-FR' and version.status = 'published';
  end if;
  return new;
end;
$$;

create trigger result_revision_attach_restitution before insert on mapp.result_revisions
for each row execute function mapp_private.attach_active_restitution();

create or replace function mapp_private.prevent_result_restitution_rebinding()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.restitution_version_id is distinct from new.restitution_version_id then
    raise exception 'A result restitution version cannot be rebound';
  end if;
  return new;
end;
$$;

create trigger result_revision_restitution_immutable before update of restitution_version_id on mapp.result_revisions
for each row execute function mapp_private.prevent_result_restitution_rebinding();

alter table mapp.profile_interactions enable row level security;
alter table mapp.restitution_sections enable row level security;
alter table mapp.active_restitution_releases enable row level security;

create policy profile_interactions_read on mapp.profile_interactions for select to authenticated using (true);
create policy published_restitution_sections_read on mapp.restitution_sections for select to authenticated using (
  publication_status = 'approved' and exists (
    select 1 from mapp.restitution_versions version
    where version.id = restitution_version_id and version.status = 'published'
  )
);
create policy approved_restitution_blocks_only on mapp.restitution_blocks
as restrictive for select to authenticated using (
  exists (
    select 1 from mapp.restitution_sections section
    join mapp.restitution_versions version on version.id = section.restitution_version_id
    where section.id = section_id and section.publication_status = 'approved' and version.status = 'published'
  )
);

grant select on mapp.profile_interactions, mapp.restitution_sections to authenticated;
revoke all on mapp.active_restitution_releases from public, anon, authenticated;
grant select on mapp.active_restitution_releases to service_role;
revoke all on function mapp.publish_restitution_version(uuid, boolean) from public, anon, authenticated;
grant execute on function mapp.publish_restitution_version(uuid, boolean) to service_role;

comment on table mapp.restitution_sections is 'Versioned editorial sections; only approved sections of published versions are participant-visible.';
comment on table mapp.profile_interactions is 'Sixteen directed profile-to-profile interactions, including same-profile relationships.';
comment on column mapp.result_revisions.restitution_version_id is 'Immutable reference to the editorial version attached when this result revision was created.';
