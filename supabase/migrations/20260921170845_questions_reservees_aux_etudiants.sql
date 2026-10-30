-- Seuls les étudiants simples (sans rôle en plus) peuvent poser une question.
drop policy if exists "questions posées par leur auteur" on public.questions;
create policy "questions posées par les étudiants" on public.questions for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'nouvelle'
    and not exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role <> 'student' or p.is_teacher or p.is_service_lead or p.is_project_lead or p.ministry_lead_of is not null)
    )
    and not exists (select 1 from public.steering_ministries())
  );;
