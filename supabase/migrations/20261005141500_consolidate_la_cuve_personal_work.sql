-- Regroupe les quatre étapes en un seul travail richement structuré.
do $$
declare
  v_session uuid := 'd7e9aebb-8514-458c-94d5-49ea65b4a2b4';
  v_assignment uuid;
  v_actor uuid;
  v_content text := 'Prenez un temps avec Dieu pour travailler sur ce qui, dans votre passé ou votre présent, peut encore influencer votre vie intérieure.

### 1. Identifier et nettoyer

Identifiez une blessure, une déception, un échec, une offense ou une situation qui a encore un impact sur vous aujourd’hui.

Écrivez ce que cette situation a produit en vous : émotions, peurs, croyances, réactions ou comportements.

Puis choisissez d’entrer dans une démarche de pardon et priez spécifiquement à ce sujet.

**Si nécessaire, ne restez pas seul(e) :** échangez avec un pasteur, un responsable, un conseiller ou une personne de confiance.

### 2. Remplir par la vérité

Après avoir identifié ce qui doit être nettoyé, remplacez les mensonges ou les mauvaises croyances par des vérités.

Écrivez **5 déclarations de vérité** que vous choisirez de proclamer régulièrement.

- « Je suis pardonné(e). »
- « Dieu m’a donné des dons. »
- « Mon passé ne définit pas mon avenir. »
- « Je peux avancer dans ce que Dieu m’appelle à devenir. »

### 3. Identifier ses « aigles »

Identifiez **3 personnes** qui vous encouragent à grandir, vous élèvent et apportent quelque chose de positif dans votre vie.

Demandez-vous également : **dans quelles personnes suis-je, moi aussi, appelé(e) à investir ?**

### 4. Réinterpréter son passé

Choisissez une expérience difficile de votre parcours que vous ne pouvez pas changer.

Demandez au Saint-Esprit de vous aider à la regarder autrement, non pour nier ce qui s’est passé, mais pour discerner ce que Dieu peut aujourd’hui en faire.

Écrivez quelques lignes en répondant à cette question :

**« Seigneur, qu’est-ce que tu veux faire naître de cette partie de mon histoire ? »**

Terminez par un temps de prière en remettant cette situation à Dieu.';
begin
  select id into v_actor from auth.users where lower(email) = 'r.tamard@gmail.com' limit 1;
  select id into v_assignment
  from public.assignments
  where session_id = v_session
    and title in ('Identifier et nettoyer', 'Travail personnel : nettoyer, remplir, s’entourer et réinterpréter')
  order by created_at
  limit 1;

  if v_assignment is null then
    insert into public.assignments (session_id, title, instructions, content_type, phase, sort_order, duration_min, due_at, created_by)
    values (v_session, 'Travail personnel : nettoyer, remplir, s’entourer et réinterpréter', v_content, 'Travail personnel', 'after', 1, 60, '2026-10-10 09:30:00+02', v_actor)
    returning id into v_assignment;
  else
    update public.assignments
    set title = 'Travail personnel : nettoyer, remplir, s’entourer et réinterpréter',
        instructions = v_content,
        description = null,
        content_type = 'Travail personnel',
        phase = 'after',
        sort_order = 1,
        duration_min = 60,
        due_at = '2026-10-10 09:30:00+02'
    where id = v_assignment;
  end if;

  delete from public.assignments
  where session_id = v_session
    and id <> v_assignment
    and title in ('Remplir par la vérité', 'Identifier ses « aigles »', 'Réinterpréter son passé');
end $$;
