-- Un formateur ne peut plus modifier n'importe quelle séance ni ajouter une consigne à n'importe quel cours :
-- seules ses propres séances (règles « teacher manages own » et « teacher insert » déjà en place) restent.
drop policy if exists "sessions updatable by teachers" on public.sessions;
drop policy if exists "assignments insérables par enseignants et admins" on public.assignments;

-- Les administrateurs gardent la main sur tous les cours
create policy "consignes ajoutées par un admin" on public.assignments
  for insert to authenticated with check (public.is_admin());
create policy "supports ajoutés par un admin" on public.materials
  for insert to authenticated with check (public.is_admin());;
