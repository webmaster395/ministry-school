begin;

-- L’ancien rôle Formateur ne confère plus de droits d’écriture implicites.
-- Les intervenants restent affichables, mais toute écriture passe désormais par
-- Administration ou par une affectation explicite en Pilotage Ministère.
drop policy if exists "linked trainers update their sessions" on public.sessions;
drop policy if exists "linked trainers manage session materials" on public.materials;
drop policy if exists "linked trainers manage session assignments" on public.assignments;
drop policy if exists "session trainers managed by authorized staff" on public.session_trainers;
drop policy if exists "course managers manage assignment steps" on public.assignment_steps;

commit;
