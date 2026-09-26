-- Harmonise les séances de l'après-midi d'octobre à décembre 2026.
-- À exécuter dans Supabase > SQL Editor.
update public.sessions
set track = 'MISE EN PRATIQUE',
    start_time = '14:30:00'
where session_date between '2026-10-01' and '2026-12-31'
  and start_time in ('14:00:00', '14:30:00')
  and end_time = '17:00:00';

-- Informations spécifiques à la séance du 3 octobre.
update public.sessions
set description = 'De la formation à l’action',
    speaker_name = 'Nathalie Boudehent'
where session_date = '2026-10-03'
  and start_time in ('14:00:00', '14:30:00')
  and end_time = '17:00:00';

-- Le titre appartient au cours lié à la séance et doit être identique dans « Mes cours ».
update public.courses
set title = 'De la formation à l’action'
where id in (
  select course_id
  from public.sessions
  where session_date = '2026-10-03'
    and start_time in ('14:00:00', '14:30:00')
    and end_time = '17:00:00'
    and course_id is not null
);
