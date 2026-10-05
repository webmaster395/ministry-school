-- Les anciennes séances identifient l'intervenant avec speaker_name. Ce champ décrit la
-- personne présentée aux étudiants, tandis que teacher_id peut seulement être le compte qui
-- prépare le contenu. On centralise donc les intervenants à partir de speaker_name.

insert into public.trainers (first_name, last_name)
select distinct
  split_part(trim(s.speaker_name), ' ', 1),
  trim(substr(trim(s.speaker_name), length(split_part(trim(s.speaker_name), ' ', 1)) + 1))
from public.sessions s
where nullif(trim(s.speaker_name), '') is not null
  and not exists (
    select 1
    from public.trainers t
    where lower(trim(concat_ws(' ', t.first_name, t.last_name))) = lower(trim(s.speaker_name))
  );

-- Retire uniquement les associations créées par le premier backfill lorsqu'elles contredisent
-- le nom d'intervenant existant. Aucun cours, profil ou formateur n'est supprimé.
delete from public.session_trainers st
using public.sessions s, public.trainers t
where st.session_id = s.id
  and st.trainer_id = t.id
  and nullif(trim(s.speaker_name), '') is not null
  and lower(trim(concat_ws(' ', t.first_name, t.last_name))) <> lower(trim(s.speaker_name));

insert into public.session_trainers (session_id, trainer_id, position)
select s.id, t.id, 0
from public.sessions s
join public.trainers t
  on lower(trim(concat_ws(' ', t.first_name, t.last_name))) = lower(trim(s.speaker_name))
where nullif(trim(s.speaker_name), '') is not null
on conflict (session_id, trainer_id) do nothing;
