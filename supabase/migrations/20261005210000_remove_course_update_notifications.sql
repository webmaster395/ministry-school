-- Les modifications éditoriales d'un cours ne doivent pas créer de message étudiant.
-- Les notifications de ressources restent les seules notifications automatiques de cours.
delete from public.announcements
where is_system = true
  and (
    target_type = 'course'
    or lower(title) like 'cours mis à jour%'
  );
