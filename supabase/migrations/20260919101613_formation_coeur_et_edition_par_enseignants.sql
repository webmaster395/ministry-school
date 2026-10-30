-- Les enseignants peuvent corriger n'importe quelle séance en cas de changement
create policy "sessions updatable by teachers"
  on public.sessions for update to authenticated
  using (((auth.jwt() -> 'app_metadata') ->> 'role') = 'teacher')
  with check (((auth.jwt() -> 'app_metadata') ->> 'role') = 'teacher');

-- Les journées génériques du 7 novembre et du 5 décembre sont remplacées par le parcours
delete from public.enrollments where session_id in (select id from public.sessions where session_date in ('2026-11-07','2026-12-05'));
delete from public.materials where session_id in (select id from public.sessions where session_date in ('2026-11-07','2026-12-05'));
delete from public.assignments where session_id in (select id from public.sessions where session_date in ('2026-11-07','2026-12-05'));
delete from public.sessions where session_date in ('2026-11-07','2026-12-05');

insert into public.sessions (session_date, start_time, end_time, location, day, session_type, description, track)
select d, '09:30', '11:00', 'MLK Studio', 'samedi', 'commun', 'À définir', 'Formation du cœur'
from unnest(array['2026-11-07','2026-12-05','2027-01-02','2027-02-06','2027-03-06','2027-04-03','2027-05-01','2027-06-05']::date[]) as d;;
