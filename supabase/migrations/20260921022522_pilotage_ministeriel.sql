-- La sensibilité ministérielle est propre à chaque ministère : les séances déjà saisies (parcours prophétique) lui sont rattachées.
update public.sessions
set session_type = 'ministere',
    ministry_id = (select id from public.ministries where slug = 'prophete')
where track = 'Sensibilité ministérielle' and session_type = 'commun';

-- Séances de démonstration pour le ministère apostolique (pilotage de Daniel Kouassi)
insert into public.sessions (session_date, start_time, end_time, location, room, day, session_type, ministry_id, description, track, speaker_name, summary, objectives)
select d, '11:30', '13:00', 'MLK Studio', 'Auditorium', 'samedi', 'ministere',
       (select id from public.ministries where slug = 'apotre'),
       case when d = '2027-01-02' then 'Comprendre la sensibilité apostolique' else 'À définir' end,
       'Sensibilité ministérielle',
       case when d = '2027-01-02' then 'Nathalie Boudehent' else null end,
       case when d = '2027-01-02' then 'Situer la sensibilité apostolique.' else null end,
       case when d = '2027-01-02' then 'Comprendre le rôle de l''envoi et de la fondation' else null end
from unnest(array['2027-01-02','2027-03-06','2027-04-03','2027-05-01','2027-06-05']::date[]) as d;

-- Le pasteur et son secrétaire préparent les séances de leur ministère
create policy "séances préparées par le pilotage" on public.sessions for update to authenticated
  using (ministry_id in (select public.steering_ministries()))
  with check (ministry_id in (select public.steering_ministries()));

create policy "supports lus par le pilotage" on public.materials for select to authenticated
  using (exists (select 1 from public.sessions s where s.id = materials.session_id and s.ministry_id in (select public.steering_ministries())));
create policy "supports ajoutés par le pilotage" on public.materials for insert to authenticated
  with check (exists (select 1 from public.sessions s where s.id = materials.session_id and s.ministry_id in (select public.steering_ministries())));

create policy "consignes lues par le pilotage" on public.assignments for select to authenticated
  using (exists (select 1 from public.sessions s where s.id = assignments.session_id and s.ministry_id in (select public.steering_ministries())));
create policy "consignes ajoutées par le pilotage" on public.assignments for insert to authenticated
  with check (exists (select 1 from public.sessions s where s.id = assignments.session_id and s.ministry_id in (select public.steering_ministries())));

-- Les étudiants lisent les supports publiés du tronc commun et de leur ministère (sans inscription préalable)
create policy "supports visibles du tronc commun et du ministère" on public.materials for select to authenticated
  using (
    visible_at <= now()
    and exists (
      select 1 from public.sessions s
      where s.id = materials.session_id
        and (s.session_type = 'commun'
             or s.ministry_id = (select p.ministry_id from public.profiles p where p.id = auth.uid()))
    )
  );
create policy "consignes du ministère lues par ses étudiants" on public.assignments for select to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = assignments.session_id
      and s.ministry_id = (select p.ministry_id from public.profiles p where p.id = auth.uid())
  ));;
