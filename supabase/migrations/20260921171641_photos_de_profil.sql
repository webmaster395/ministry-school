alter table public.profiles add column if not exists avatar_path text;

-- Qui peut voir la photo d'un membre : lui-même, l'administrateur, et le personnel qui en a besoin
-- (enseignants, responsables de service, chefs de projet, pasteurs et leurs secrétaires).
create or replace function public.can_see_avatars() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'teacher' or p.is_teacher or p.is_service_lead or p.is_project_lead or p.ministry_lead_of is not null)
    )
    or exists (select 1 from public.steering_ministries());
$$;
revoke execute on function public.can_see_avatars() from public, anon;
grant execute on function public.can_see_avatars() to authenticated;

-- Stockage privé, petit : photos réduites côté navigateur (512 Ko au plus)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 524288, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "photos : dépôt par le propriétaire" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos : remplacement par le propriétaire" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos : suppression par le propriétaire ou l'admin" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "photos : lecture par le propriétaire et le personnel" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.can_see_avatars()));

-- La liste des participants renvoie aussi la photo (visible seulement du personnel, par la règle ci-dessus)
drop function if exists public.opportunity_participants(uuid);
create or replace function public.opportunity_participants(p_opp uuid) returns table (full_name text, avatar_path text)
language sql stable security definer set search_path = public as $$
  select p.full_name, p.avatar_path from public.opportunity_registrations r
  join public.profiles p on p.id = r.user_id
  join public.opportunities o on o.id = r.opportunity_id
  where r.opportunity_id = p_opp and (o.created_by = auth.uid() or public.is_admin())
  order by r.created_at;
$$;
revoke execute on function public.opportunity_participants(uuid) from public, anon;
grant execute on function public.opportunity_participants(uuid) to authenticated;;
