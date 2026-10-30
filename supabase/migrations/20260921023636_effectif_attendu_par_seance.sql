-- Nombre d'étudiants attendus par séance, réservé à ceux qui préparent la séance
-- (administrateur, enseignant de la séance, pilotage du ministère). Aucun nom n'est renvoyé.
create or replace function public.session_headcounts(p_ids uuid[])
returns table (session_id uuid, students bigint)
language sql stable security definer set search_path = public as $$
  select s.id,
    (select count(*) from public.profiles p
      where p.role = 'student'
        and p.email_confirmed
        and (
          s.session_type = 'commun'
          or (p.ministry_id = s.ministry_id and (p.preferred_day is null or p.preferred_day = s.day))
        ))
  from public.sessions s
  where s.id = any(p_ids)
    and (
      public.is_admin()
      or s.teacher_id = auth.uid()
      or s.ministry_id in (select public.steering_ministries())
    );
$$;
revoke execute on function public.session_headcounts(uuid[]) from public, anon;
grant execute on function public.session_headcounts(uuid[]) to authenticated;;
