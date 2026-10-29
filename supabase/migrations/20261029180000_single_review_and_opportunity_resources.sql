begin;

-- Une seule validation de Nathalie ou Flora suffit à déclencher la publication demandée.
create or replace function public.review_opportunity(
  p_opportunity uuid, p_decision text, p_message text default null
) returns void language plpgsql security definer set search_path = public, auth as $$
declare
  v_request public.opportunity_review_requests%rowtype;
  v_title text;
  v_person record;
begin
  if not public.is_opportunity_required_reviewer() then raise exception 'FORBIDDEN'; end if;
  if p_decision not in ('approve', 'changes_requested') then raise exception 'INVALID_DECISION'; end if;
  select * into v_request from public.opportunity_review_requests where opportunity_id = p_opportunity for update;
  if not found or v_request.status <> 'pending' then raise exception 'NO_PENDING_REVIEW'; end if;
  select title into v_title from public.opportunities where id = p_opportunity;

  if p_decision = 'changes_requested' then
    if coalesce(trim(p_message), '') = '' then raise exception 'MESSAGE_REQUIRED'; end if;
    update public.opportunity_review_requests set
      status = 'changes_requested', correction_message = trim(p_message),
      resolved_at = now(), updated_at = now()
    where opportunity_id = p_opportunity;
    delete from public.opportunity_review_approvals where opportunity_id = p_opportunity;
    update public.opportunities set publication_status = 'draft', published_at = null, updated_at = now()
    where id = p_opportunity and publication_status not in ('published', 'scheduled');
    for v_person in select user_id from public.opportunity_assignments where opportunity_id = p_opportunity loop
      perform public.notify_opportunity_recipient(
        v_person.user_id, p_opportunity,
        'Corrections demandées : ' || v_title,
        trim(p_message), 'Voir les corrections', 'opportunity_changes_requested'
      );
    end loop;
    return;
  end if;

  insert into public.opportunity_review_approvals(opportunity_id, reviewer_id, approved_at)
  values(p_opportunity, auth.uid(), now())
  on conflict(opportunity_id, reviewer_id) do update set approved_at = now();

  update public.opportunity_review_requests set status = 'approved', resolved_at = now(), updated_at = now()
  where opportunity_id = p_opportunity;
  update public.opportunities set
    publication_status = v_request.desired_publication_status,
    published_at = case when v_request.desired_publication_status = 'published' then now() else v_request.desired_published_at end,
    archived_at = null,
    updated_at = now()
  where id = p_opportunity;
end $$;

create table if not exists public.opportunity_resources (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  kind text not null check (kind in ('support', 'resource', 'link')),
  external_url text,
  file_path text,
  file_name text,
  mime_type text,
  created_by uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'link' and external_url is not null and file_path is null)
    or (kind in ('support', 'resource') and file_path is not null and external_url is null)
  )
);

create index if not exists opportunity_resources_opportunity_idx
  on public.opportunity_resources(opportunity_id, created_at);

alter table public.opportunity_resources enable row level security;

create policy opportunity_resources_read on public.opportunity_resources for select to authenticated
using (
  public.can_contribute_opportunity(opportunity_id)
  or exists(
    select 1 from public.opportunities o
    where o.id = opportunity_id and public.opportunity_is_visible(o)
  )
);
create policy opportunity_resources_insert on public.opportunity_resources for insert to authenticated
with check (created_by = auth.uid() and public.can_contribute_opportunity(opportunity_id));
create policy opportunity_resources_update on public.opportunity_resources for update to authenticated
using (public.can_contribute_opportunity(opportunity_id))
with check (public.can_contribute_opportunity(opportunity_id));
create policy opportunity_resources_delete on public.opportunity_resources for delete to authenticated
using (public.can_contribute_opportunity(opportunity_id));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values(
  'opportunity-resources', 'opportunity-resources', false, 26214400,
  array[
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv', 'image/jpeg', 'image/png', 'image/webp', 'application/zip'
  ]
)
on conflict(id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "opportunity resources authorized read" on storage.objects for select to authenticated
using (
  bucket_id = 'opportunity-resources'
  and exists(
    select 1 from public.opportunity_resources r
    join public.opportunities o on o.id = r.opportunity_id
    where r.file_path = name
      and (public.can_contribute_opportunity(r.opportunity_id) or public.opportunity_is_visible(o))
  )
);
create policy "opportunity resources contributor upload" on storage.objects for insert to authenticated
with check (
  bucket_id = 'opportunity-resources'
  and public.can_contribute_opportunity(((storage.foldername(name))[1])::uuid)
);
create policy "opportunity resources contributor delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'opportunity-resources'
  and public.can_contribute_opportunity(((storage.foldername(name))[1])::uuid)
);

commit;
