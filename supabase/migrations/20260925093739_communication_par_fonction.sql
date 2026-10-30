-- Cibles supplémentaires d'un message : le cours d'un formateur, une formation ou un projet
alter table public.announcements
  add column if not exists session_id uuid references public.sessions(id) on delete cascade,
  add column if not exists opportunity_id uuid references public.opportunities(id) on delete cascade,
  add column if not exists sent_as text;

-- Envoi : chacun n'écrit qu'à son périmètre
--   Admin : à toute la promotion ou à un ministère
--   Formateur : uniquement les étudiants de son cours (une de ses séances)
--   Pilotage ministère : uniquement son ministère
--   Chef de projet / responsable de service : uniquement les inscrits de son projet / de sa formation
drop policy if exists "announcements insertable by author" on public.announcements;
create policy "messages envoyés dans son périmètre" on public.announcements
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      public.is_admin()
      or (
        day is null
        and ministry_id is null and opportunity_id is null
        and session_id is not null
        and exists (select 1 from public.sessions s where s.id = announcements.session_id and s.teacher_id = auth.uid())
      )
      or (
        day is null
        and session_id is null and opportunity_id is null
        and ministry_id is not null
        and ministry_id in (select public.steering_ministries())
      )
      or (
        day is null
        and session_id is null and ministry_id is null
        and opportunity_id is not null
        and public.owns_opportunity(opportunity_id)
      )
    )
  );

-- Lecture par un étudiant : les messages qui le concernent
drop policy if exists "announcements readable by targeted students" on public.announcements;
create policy "messages lus par les étudiants concernés" on public.announcements
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'student'
        and (
          -- message général ou de ministère
          (
            announcements.session_id is null and announcements.opportunity_id is null
            and (announcements.ministry_id is null or p.ministry_id = announcements.ministry_id)
            and (announcements.day is null or p.preferred_day = announcements.day)
          )
          -- message d'un projet ou d'une formation : ses inscrits
          or (
            announcements.opportunity_id is not null
            and exists (
              select 1 from public.opportunity_registrations r
              where r.opportunity_id = announcements.opportunity_id and r.user_id = p.id
            )
          )
          -- message d'un formateur pour sa séance
          or (
            announcements.session_id is not null
            and exists (
              select 1 from public.sessions s
              where s.id = announcements.session_id
                and (s.session_type = 'commun' or s.ministry_id = p.ministry_id)
            )
          )
        )
    )
  );

-- Chacun retrouve ce qu'il a lui-même envoyé (pilotage, chefs de projet, responsables de service)
create policy "messages lus par leur auteur" on public.announcements
  for select to authenticated
  using (author_id = auth.uid());;
