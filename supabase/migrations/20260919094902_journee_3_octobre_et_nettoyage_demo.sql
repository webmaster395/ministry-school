-- Intervenant sans compte + intitulé du parcours affiché en pastille
alter table public.sessions add column if not exists speaker_name text;
alter table public.sessions add column if not exists track text;

-- Suppression des formations de démonstration (séances de ministère, cours, et ce qui s'y rattache)
with demo as (select id from public.sessions where session_type = 'ministere')
delete from public.enrollments where session_id in (select id from demo);
with demo as (select id from public.sessions where session_type = 'ministere')
delete from public.materials where session_id in (select id from demo);
with demo as (select id from public.sessions where session_type = 'ministere')
delete from public.assignments where session_id in (select id from demo);
delete from public.sessions where session_type = 'ministere';
delete from public.courses;

-- Ancienne séance générique du 3 octobre, remplacée par le vrai programme
delete from public.enrollments where session_id in (select id from public.sessions where session_date = '2026-10-03');
delete from public.materials where session_id in (select id from public.sessions where session_date = '2026-10-03');
delete from public.assignments where session_id in (select id from public.sessions where session_date = '2026-10-03');
delete from public.sessions where session_date = '2026-10-03';

insert into public.sessions (session_date, start_time, end_time, location, day, session_type, description, track, speaker_name, teacher_id)
values
  ('2026-10-03', '09:30', '11:00', 'Espace Martin Luther King · Créteil', 'samedi', 'commun', 'La Cuve', 'Formation du cœur', 'Paul Goulet', null),
  ('2026-10-03', '11:30', '13:00', 'Espace Martin Luther King · Créteil', 'samedi', 'commun', 'Dons, appel et responsabilités dans l''Église', 'Formation du caractère', null, '11111111-1111-1111-1111-111111111111'),
  ('2026-10-03', '14:00', '17:00', 'Espace Martin Luther King · Créteil', 'samedi', 'commun', 'Présentation des projets', 'Votre parcours : Accélérateur de projet', 'Nathalie Boudehent', null);;
