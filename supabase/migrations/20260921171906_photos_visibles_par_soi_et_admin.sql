-- Décision : une photo de profil n'est visible que de la personne et de l'administrateur.
create or replace function public.can_see_avatars() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin();
$$;

drop policy if exists "photos : lecture par le propriétaire et le personnel" on storage.objects;
create policy "photos : lecture par le propriétaire et l'admin" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- Les responsables voient la liste de leurs participants, mais pas leurs photos
create or replace function public.opportunity_participants(p_opp uuid) returns table (full_name text, avatar_path text)
language sql stable security definer set search_path = public as $$
  select p.full_name, case when public.is_admin() then p.avatar_path end
  from public.opportunity_registrations r
  join public.profiles p on p.id = r.user_id
  join public.opportunities o on o.id = r.opportunity_id
  where r.opportunity_id = p_opp and (o.created_by = auth.uid() or public.is_admin())
  order by r.created_at;
$$;;
