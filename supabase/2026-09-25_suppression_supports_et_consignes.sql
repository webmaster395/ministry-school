-- Suppression des supports et des consignes d'un cours depuis la page de préparation.
-- Autorisé : l'administrateur, le formateur du cours, le pilotage du ministère, et l'auteur de l'élément.
-- À exécuter dans Supabase > SQL Editor.

drop policy if exists "supports supprimés par la préparation" on public.materials;
create policy "supports supprimés par la préparation"
  on public.materials
  for delete
  to authenticated
  using (
    public.is_admin()
    or created_by = auth.uid()
    or exists (
      select 1 from public.sessions s
      where s.id = materials.session_id
        and (s.teacher_id = auth.uid() or s.ministry_id in (select public.steering_ministries()))
    )
  );

drop policy if exists "consignes supprimées par la préparation" on public.assignments;
create policy "consignes supprimées par la préparation"
  on public.assignments
  for delete
  to authenticated
  using (
    public.is_admin()
    or created_by = auth.uid()
    or exists (
      select 1 from public.sessions s
      where s.id = assignments.session_id
        and (s.teacher_id = auth.uid() or s.ministry_id in (select public.steering_ministries()))
    )
  );

-- Pour annuler :
--   drop policy "supports supprimés par la préparation" on public.materials;
--   drop policy "consignes supprimées par la préparation" on public.assignments;
