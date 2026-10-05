-- Les notifications créées avant l'ajout des CTA conservent leur auteur réel
-- dans author_id, mais sont présentées aux étudiants comme des messages système.
update public.announcements
set
  is_system = true,
  sent_as = null,
  target_url = '/etudiant/seances/' || session_id::text || '#course-resources',
  target_type = 'resource',
  cta_label = 'Voir le support'
where session_id is not null
  and (
    lower(title) like 'nouveau support%'
    or lower(title) like 'nouvelle ressource%'
    or lower(title) like 'de nouvelles ressources%'
  );

update public.announcements
set
  is_system = true,
  sent_as = null,
  target_url = '/etudiant/seances/' || session_id::text || '#after-course',
  target_type = 'assignment',
  cta_label = 'Voir le travail'
where session_id is not null
  and lower(title) like 'nouveau travail%';

update public.announcements
set
  is_system = true,
  sent_as = null,
  target_url = '/etudiant/seances/' || session_id::text || '#course-content',
  target_type = 'course',
  cta_label = 'Voir le cours'
where session_id is not null
  and lower(title) like 'cours mis à jour%';
