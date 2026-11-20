begin;

alter table public.app_catalog
  add column if not exists identity_result_mode text not null default 'none',
  add column if not exists identity_importance text not null default 'recommended',
  add column if not exists result_provider text,
  add column if not exists post_description text;

alter table public.app_catalog
  drop constraint if exists app_catalog_identity_result_mode_check;
alter table public.app_catalog
  add constraint app_catalog_identity_result_mode_check
  check (identity_result_mode in ('none', 'automatic', 'manual'));

alter table public.app_catalog
  drop constraint if exists app_catalog_identity_importance_check;
alter table public.app_catalog
  add constraint app_catalog_identity_importance_check
  check (identity_importance in ('priority', 'recommended', 'optional'));

-- Cette migration est additive : les sources de résultats historiques ne sont
-- ni déplacées ni modifiées. Elle rattache seulement les fiches du catalogue à
-- leur fournisseur de résultat actuel.
update public.app_catalog
set identity_result_mode = 'automatic',
    identity_importance = 'priority',
    result_provider = 'mapp',
    post_description = coalesce(post_description, short_description),
    placement_post = true
where slug = 'profil-mapp';

update public.app_catalog
set identity_result_mode = 'automatic',
    identity_importance = 'recommended',
    result_provider = case slug
      when 'fruit-de-lesprit' then 'fruit'
      when 'dons-spirituels' then 'gifts'
      when 'competences-naturelles' then 'skills'
    end,
    post_description = coalesce(post_description, short_description),
    placement_post = true
where slug in ('fruit-de-lesprit', 'dons-spirituels', 'competences-naturelles');

update public.app_catalog
set identity_result_mode = 'automatic',
    identity_importance = 'recommended',
    result_provider = 'life-line',
    post_description = coalesce(post_description, short_description),
    placement_post = true
where slug = 'ma-ligne-de-vie';

update public.app_catalog
set tool_type = 'external',
    identity_result_mode = 'none',
    identity_importance = 'recommended',
    result_provider = null,
    post_description = coalesce(post_description, short_description),
    placement_post = true
where slug = 'generopoly';

update public.app_catalog
set tool_type = 'external',
    identity_result_mode = 'manual',
    identity_importance = 'priority',
    result_provider = 'heroes-motors',
    post_description = coalesce(post_description, short_description),
    post_image_url = '/identity/heroes/dove-abstract-v1.webp',
    placement_post = true
where slug = 'test-des-heros';

update public.app_catalog
set identity_result_mode = 'automatic',
    identity_importance = 'recommended',
    result_provider = 'apest',
    post_description = coalesce(post_description, short_description),
    placement_post = true
where slug like '%apest%';

create table if not exists public.app_user_progress (
  app_id uuid not null references public.app_catalog(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  open_count integer not null default 0 check (open_count >= 0),
  submission_confirmed_at timestamptz,
  completion_source text,
  reset_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (app_id, user_id)
);

create index if not exists app_user_progress_user_idx
  on public.app_user_progress(user_id, app_id);

alter table public.app_user_progress enable row level security;

drop policy if exists app_user_progress_owner_reads on public.app_user_progress;
create policy app_user_progress_owner_reads on public.app_user_progress
for select to authenticated
using (user_id = auth.uid() or public.is_super_admin());

revoke all on public.app_user_progress from anon, authenticated;
grant select on public.app_user_progress to authenticated;

create or replace function public.record_app_open(p_app_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(
    select 1
    from public.app_catalog app
    join public.profiles profile on profile.id = current_user_id
    where app.id = p_app_id
      and app.archived_at is null
      and not coalesce(profile.deactivated, false)
      and (
        public.is_super_admin(current_user_id)
        or (
          app.status in ('scheduled', 'published')
          and app.student_enabled
          and (app.student_publish_at is null or app.student_publish_at <= now())
          and public.can_access_resource('app_catalog', app.id, current_user_id)
        )
      )
  ) then raise exception 'FORBIDDEN'; end if;

  insert into public.app_user_progress as progress(
    app_id, user_id, first_opened_at, last_opened_at, open_count, updated_at
  ) values (
    p_app_id, current_user_id, now(), now(), 1, now()
  )
  on conflict(app_id, user_id) do update set
    first_opened_at = coalesce(progress.first_opened_at, excluded.first_opened_at),
    last_opened_at = excluded.last_opened_at,
    open_count = progress.open_count + 1,
    updated_at = now();
end $$;

revoke all on function public.record_app_open(uuid) from public, anon;
grant execute on function public.record_app_open(uuid) to authenticated;

create or replace function public.reset_app_progress(p_app_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  if not exists(select 1 from public.app_catalog where id = p_app_id and tool_type = 'external') then
    raise exception 'EXTERNAL_APP_REQUIRED';
  end if;

  insert into public.app_user_progress(app_id, user_id, reset_at, updated_at)
  values(p_app_id, p_user_id, now(), now())
  on conflict(app_id, user_id) do update set
    reset_at = now(),
    updated_at = now();
end $$;

revoke all on function public.reset_app_progress(uuid,uuid) from public, anon;
grant execute on function public.reset_app_progress(uuid,uuid) to authenticated;

create or replace function public.confirm_app_submissions(p_app_id uuid, p_submissions jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;

  insert into public.app_user_progress as progress(
    app_id, user_id, submission_confirmed_at, completion_source, updated_at
  )
  select
    p_app_id,
    submitted.user_id,
    submitted.submitted_at,
    'admin_import',
    now()
  from jsonb_to_recordset(coalesce(p_submissions, '[]'::jsonb))
    as submitted(user_id uuid, submitted_at timestamptz)
  where submitted.user_id is not null and submitted.submitted_at is not null
  on conflict(app_id, user_id) do update set
    submission_confirmed_at = case
      when progress.submission_confirmed_at is null then excluded.submission_confirmed_at
      else greatest(progress.submission_confirmed_at, excluded.submission_confirmed_at)
    end,
    completion_source = excluded.completion_source,
    updated_at = now();
end $$;

revoke all on function public.confirm_app_submissions(uuid,jsonb) from public, anon;
grant execute on function public.confirm_app_submissions(uuid,jsonb) to authenticated;

-- La fonction SECURITY DEFINER du Test des héros doit composer avec les mêmes
-- listes et personnes que le catalogue. Un clic externe ne suffit jamais : le
-- résultat reste conditionné à publication_status + visible.
create or replace function public.get_my_heroes_motors_result()
returns table (
  id uuid,
  first_name text,
  communication_status text,
  portrait text,
  motors jsonb,
  heroes jsonb,
  published_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    result.id,
    result.first_name,
    result.communication_status,
    case when result.communication_status = 'authorized' then result.portrait else null end,
    case when result.communication_status = 'authorized' then result.motors else '[]'::jsonb end,
    case when result.communication_status = 'authorized' then result.heroes else '[]'::jsonb end,
    coalesce(result.published_at, result.updated_at)
  from public.heroes_motors_results result
  where result.user_id = auth.uid()
    and result.communication_status in ('authorized', 'refused')
    and exists(
      select 1 from public.profiles profile
      where profile.id = auth.uid() and not coalesce(profile.deactivated, false)
    )
    and (
      public.is_super_admin()
      or (
        result.publication_status = 'published'
        and result.visible
        and exists (
          select 1 from public.app_catalog app
          where app.slug = 'test-des-heros'
            and app.status in ('scheduled', 'published')
            and app.student_enabled
            and (app.student_publish_at is null or app.student_publish_at <= now())
            and public.can_access_resource('app_catalog', app.id, auth.uid())
        )
      )
    )
  order by coalesce(result.published_at, result.updated_at) desc
  limit 1;
$$;

revoke all on function public.get_my_heroes_motors_result() from public, anon;
grant execute on function public.get_my_heroes_motors_result() to authenticated;

commit;
