create table if not exists public.assignment_steps (
  id uuid primary key default gen_random_uuid(), assignment_id uuid not null references public.assignments(id) on delete cascade,
  title text not null, instructions text not null, sort_order integer not null default 0, created_at timestamptz not null default now()
);
create index if not exists assignment_steps_assignment_order_idx on public.assignment_steps(assignment_id, sort_order, created_at);
create unique index if not exists assignment_steps_assignment_position_uidx on public.assignment_steps(assignment_id, sort_order);
create table if not exists public.assignment_step_completions (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  step_id uuid not null references public.assignment_steps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, completed_at timestamptz not null default now(), primary key (step_id, user_id)
);
alter table public.assignment_steps enable row level security;
alter table public.assignment_step_completions enable row level security;
create policy "assignment steps follow assignment access" on public.assignment_steps for select to authenticated using (exists (select 1 from public.assignments a where a.id = assignment_id));
create policy "course managers manage assignment steps" on public.assignment_steps for all to authenticated
using (exists (select 1 from public.assignments a join public.sessions s on s.id = a.session_id where a.id = assignment_id and (is_admin() or s.teacher_id = auth.uid() or s.ministry_id in (select steering_ministries()) or is_linked_session_trainer(s.id))))
with check (exists (select 1 from public.assignments a join public.sessions s on s.id = a.session_id where a.id = assignment_id and (is_admin() or s.teacher_id = auth.uid() or s.ministry_id in (select steering_ministries()) or is_linked_session_trainer(s.id))));
create policy "students read own assignment steps" on public.assignment_step_completions for select to authenticated using (user_id = auth.uid());
create policy "students complete own assignment steps" on public.assignment_step_completions for insert to authenticated with check (user_id = auth.uid());
create policy "students reopen own assignment steps" on public.assignment_step_completions for delete to authenticated using (user_id = auth.uid());

do $$
declare v_assignment uuid;
begin
  select id into v_assignment from public.assignments where session_id = 'd7e9aebb-8514-458c-94d5-49ea65b4a2b4' and title = 'Travail personnel : nettoyer, remplir, s’entourer et réinterpréter' limit 1;
  if v_assignment is null then return; end if;
  update public.assignments set instructions = 'Prenez un temps avec Dieu pour travailler sur ce qui, dans votre passé ou votre présent, peut encore influencer votre vie intérieure.' where id = v_assignment;
  insert into public.assignment_steps (assignment_id,title,instructions,sort_order) values
  (v_assignment,'Identifier et nettoyer','Identifiez une blessure, une déception, un échec, une offense ou une situation qui a encore un impact sur vous aujourd’hui.

Écrivez ce que cette situation a produit en vous : émotions, peurs, croyances, réactions ou comportements.

Puis choisissez d’entrer dans une démarche de pardon et priez spécifiquement à ce sujet.

**Si nécessaire, ne restez pas seul(e) :** échangez avec un pasteur, un responsable, un conseiller ou une personne de confiance.',1),
  (v_assignment,'Remplir par la vérité','Après avoir identifié ce qui doit être nettoyé, remplacez les mensonges ou les mauvaises croyances par des vérités.

Écrivez **5 déclarations de vérité** que vous choisirez de proclamer régulièrement.

- « Je suis pardonné(e). »
- « Dieu m’a donné des dons. »
- « Mon passé ne définit pas mon avenir. »
- « Je peux avancer dans ce que Dieu m’appelle à devenir. »',2),
  (v_assignment,'Identifier ses « aigles »','Identifiez **3 personnes** qui vous encouragent à grandir, vous élèvent et apportent quelque chose de positif dans votre vie.

Demandez-vous également : **dans quelles personnes suis-je, moi aussi, appelé(e) à investir ?**',3),
  (v_assignment,'Réinterpréter son passé','Choisissez une expérience difficile de votre parcours que vous ne pouvez pas changer.

Demandez au Saint-Esprit de vous aider à la regarder autrement, non pour nier ce qui s’est passé, mais pour discerner ce que Dieu peut aujourd’hui en faire.

Écrivez quelques lignes en répondant à cette question : **« Seigneur, qu’est-ce que tu veux faire naître de cette partie de mon histoire ? »**

Terminez par un temps de prière en remettant cette situation à Dieu.',4)
  on conflict do nothing;
end $$;
