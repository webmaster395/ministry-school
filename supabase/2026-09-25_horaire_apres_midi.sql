-- Les formations de service et projets de l'après-midi commencent à 14h30 (et non plus 14h).
-- À exécuter dans Supabase > SQL Editor.
update public.opportunity_dates
set start_time = '14:30'
where start_time = '14:00:00' and end_time = '17:00:00';

-- Pour annuler :
--   update public.opportunity_dates set start_time = '14:00' where start_time = '14:30:00' and end_time = '17:00:00';

-- Les séances de l'après-midi du programme (accueil étudiant, calendrier, fiches) : même horaire.
update public.sessions
set start_time = '14:30'
where start_time = '14:00:00' and end_time = '17:00:00';
--   (pour annuler : update public.sessions set start_time = '14:00' where start_time = '14:30:00' and end_time = '17:00:00';)
