begin;

-- Exact 44-question production journey from rtgp2911/profil-mapp-app.
-- Additive only: legacy v3/v4 sessions, attempts and results remain untouched.
do $$
declare
  questionnaire uuid;
  version_id uuid;
  scoring_id uuid;
  natural_section uuid;
  pressure_section uuid;
  truth_scale uuid;
  agreement_scale uuid;
  question_id uuid;
  session_id uuid;
begin
  select id into truth_scale from mapp.answer_scales where code='truth-5';
  select id into agreement_scale from mapp.answer_scales where code='agreement-4';
  if truth_scale is null or agreement_scale is null then raise exception 'MAPP answer scales missing'; end if;

  insert into mapp.questionnaires(code,name,description)
  values ('profil-mapp-hybrid-44-v1.0.0','Profil MAPP · Questionnaire officiel 44','Parcours exact actuellement publié sur profil-mapp.vercel.app')
  on conflict(code) do nothing;
  select id into questionnaire from mapp.questionnaires where code='profil-mapp-hybrid-44-v1.0.0';

  select id into version_id from mapp.questionnaire_versions where questionnaire_id=questionnaire and version=1;
  if version_id is null then
    insert into mapp.questionnaire_versions(questionnaire_id,version,status,order_strategy,publication_rules)
    values(questionnaire,1,'draft','editorial','{"total_questions":44,"natural_duels":24,"natural_likert":8,"pressure_duels":12,"active_for_new_attempts":true}'::jsonb)
    returning id into version_id;
    insert into mapp.questionnaire_sections(questionnaire_version_id,code,title,context,position)
    values(version_id,'natural','Comportement naturel','natural',1) returning id into natural_section;
    insert into mapp.questionnaire_sections(questionnaire_version_id,code,title,context,position)
    values(version_id,'under_pressure','Sous pression','under_pressure',2) returning id into pressure_section;
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N01','Dans un groupe, je contribue surtout en…',1,'{"mapp_kind":"natural_duel","source_id":"N01"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Définissant une direction et les actions à mener.',1,'D','D');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Donnant envie aux autres de participer et de s’impliquer.',2,'I','I');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N02','Ce qui me stimule le plus, c’est…',2,'{"mapp_kind":"natural_duel","source_id":"N02"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Partager une idée qui suscite l’enthousiasme autour de moi.',1,'I','I');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Me fixer un défi ambitieux et chercher à le relever.',2,'D','D');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N03','Dans ma façon de communiquer, je préfère…',3,'{"mapp_kind":"natural_duel","source_id":"N03"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Exprimer directement l’essentiel de mon message.',1,'D','D');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Développer mes idées et rendre l’échange vivant.',2,'I','I');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N04','Dans ce que j’entreprends, j’apprécie particulièrement…',4,'{"mapp_kind":"natural_duel","source_id":"N04"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Pouvoir convaincre et entraîner les autres autour de mes idées.',1,'I','I');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Pouvoir décider librement de la direction à prendre.',2,'D','D');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N05','Dans mon quotidien, j’apprécie davantage…',5,'{"mapp_kind":"natural_duel","source_id":"N05"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','La possibilité de prendre des initiatives et de découvrir de nouvelles possibilités.',1,'D','D');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','La possibilité de m’appuyer sur des habitudes et des repères stables.',2,'S','S');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N06','Dans un travail collectif, ce qui compte le plus pour moi, c’est…',6,'{"mapp_kind":"natural_duel","source_id":"N06"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Que chacun se sente écouté et puisse contribuer à sa manière.',1,'S','S');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Que chacun sache ce qu’il doit accomplir pour atteindre l’objectif.',2,'D','D');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N07','Pour prendre une décision qui concerne plusieurs personnes, je préfère…',7,'{"mapp_kind":"natural_duel","source_id":"N07"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Assumer la responsabilité du choix et définir une direction.',1,'D','D');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Prendre le temps de consulter les personnes concernées.',2,'S','S');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N08','Ce qui me motive le plus dans un engagement de longue durée, c’est…',8,'{"mapp_kind":"natural_duel","source_id":"N08"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Pouvoir contribuer avec constance à quelque chose qui dure.',1,'S','S');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Pouvoir relever régulièrement de nouveaux défis.',2,'D','D');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N09','Dans ma façon de travailler, je préfère…',9,'{"mapp_kind":"natural_duel","source_id":"N09"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Avoir la liberté de choisir mes propres méthodes.',1,'D','D');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','M’appuyer sur des méthodes éprouvées et fiables.',2,'C','C');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N10','Dans une discussion, j’ai plutôt tendance à…',10,'{"mapp_kind":"natural_duel","source_id":"N10"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Examiner la solidité des arguments présentés.',1,'C','C');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Défendre clairement ma position.',2,'D','D');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N11','Face à une opportunité qui comporte une part d’incertitude…',11,'{"mapp_kind":"natural_duel","source_id":"N11"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Je suis prêt à prendre un risque pour saisir cette opportunité.',1,'D','D');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Je préfère évaluer les risques avant de m’engager.',2,'C','C');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N12','Dans un travail, je suis particulièrement attentif…',12,'{"mapp_kind":"natural_duel","source_id":"N12"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','À l’exactitude des informations et des détails.',1,'C','C');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Aux résultats obtenus et aux objectifs atteints.',2,'D','D');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N13','Avec de nouvelles personnes…',13,'{"mapp_kind":"natural_duel","source_id":"N13"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','J’engage spontanément la conversation.',1,'I','I');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Je prends le temps de créer un lien progressivement.',2,'S','S');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N14','Dans une discussion…',14,'{"mapp_kind":"natural_duel","source_id":"N14"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','J’écoute attentivement avant de donner mon avis.',1,'S','S');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Je partage facilement mes idées et mes réactions.',2,'I','I');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N15','Dans un groupe…',15,'{"mapp_kind":"natural_duel","source_id":"N15"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','J’aime animer les échanges.',1,'I','I');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','J’aime veiller à ce que chacun se sente à l’aise.',2,'S','S');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N16','Pour entretenir une relation…',16,'{"mapp_kind":"natural_duel","source_id":"N16"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Je reste présent et prends régulièrement des nouvelles.',1,'S','S');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Je propose spontanément des moments à partager.',2,'I','I');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N17','Pour faire comprendre une idée…',17,'{"mapp_kind":"natural_duel","source_id":"N17"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','J’utilise des exemples vivants et engageants.',1,'I','I');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Je présente des arguments précis et structurés.',2,'C','C');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N18','Quand je découvre un nouveau sujet…',18,'{"mapp_kind":"natural_duel","source_id":"N18"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','J’aime l’approfondir et en comprendre les détails.',1,'C','C');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','J’aime en discuter avec d’autres.',2,'I','I');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N19','Pour développer une idée…',19,'{"mapp_kind":"natural_duel","source_id":"N19"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','J’échange avec d’autres pour faire émerger des possibilités.',1,'I','I');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Je prends le temps de structurer mon raisonnement.',2,'C','C');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N20','Avant de partager une information importante…',20,'{"mapp_kind":"natural_duel","source_id":"N20"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Je vérifie son exactitude et les détails qui la soutiennent.',1,'C','C');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Je réfléchis à la manière de la rendre intéressante et accessible.',2,'I','I');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N21','Dans mon quotidien, j’apprécie…',21,'{"mapp_kind":"natural_duel","source_id":"N21"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Des habitudes stables et familières.',1,'S','S');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Une organisation précise et structurée.',2,'C','C');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N22','Dans ma manière de travailler…',22,'{"mapp_kind":"natural_duel","source_id":"N22"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Je privilégie la précision et la rigueur.',1,'C','C');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Je privilégie la régularité et la constance.',2,'S','S');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N23','Quand quelqu’un me demande de l’aide…',23,'{"mapp_kind":"natural_duel","source_id":"N23"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Je l’écoute et cherche à le soutenir.',1,'S','S');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Je cherche à comprendre précisément le problème.',2,'C','C');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,truth_scale,'N24','Ce qui me rassure le plus…',24,'{"mapp_kind":"natural_duel","source_id":"N24"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Des informations précises et vérifiables.',1,'C','C');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Des relations fiables et durables.',2,'S','S');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,agreement_scale,'E01','Je suis à l’aise pour prendre une responsabilité importante.',25,'{"mapp_kind":"natural_likert","source_id":"E01","dimension_code":"D"}'::jsonb)
    returning id into question_id;
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,agreement_scale,'E02','J’ose défendre mon avis même lorsque la majorité pense autrement.',26,'{"mapp_kind":"natural_likert","source_id":"E02","dimension_code":"D"}'::jsonb)
    returning id into question_id;
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,agreement_scale,'E03','Je communique facilement mon enthousiasme aux autres.',27,'{"mapp_kind":"natural_likert","source_id":"E03","dimension_code":"I"}'::jsonb)
    returning id into question_id;
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,agreement_scale,'E04','J’aime aller à la rencontre de nouvelles personnes.',28,'{"mapp_kind":"natural_likert","source_id":"E04","dimension_code":"I"}'::jsonb)
    returning id into question_id;
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,agreement_scale,'E05','Les autres peuvent compter sur moi dans la durée.',29,'{"mapp_kind":"natural_likert","source_id":"E05","dimension_code":"S"}'::jsonb)
    returning id into question_id;
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,agreement_scale,'E06','Je prends naturellement le temps d’écouter les autres.',30,'{"mapp_kind":"natural_likert","source_id":"E06","dimension_code":"S"}'::jsonb)
    returning id into question_id;
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,agreement_scale,'E07','Je repère facilement les incohérences dans un raisonnement.',31,'{"mapp_kind":"natural_likert","source_id":"E07","dimension_code":"C"}'::jsonb)
    returning id into question_id;
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,natural_section,agreement_scale,'E08','J’aime comprendre les causes profondes d’un problème.',32,'{"mapp_kind":"natural_likert","source_id":"E08","dimension_code":"C"}'::jsonb)
    returning id into question_id;
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,pressure_section,truth_scale,'P01','Face à une urgence…',33,'{"mapp_kind":"pressure_duel","source_id":"P01"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Je prends rapidement les choses en main.',1,'D','D');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Je cherche à mobiliser les personnes pour agir ensemble.',2,'I','I');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,pressure_section,truth_scale,'P02','Quand les événements s’accélèrent…',34,'{"mapp_kind":"pressure_duel","source_id":"P02"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Je tranche rapidement pour avancer.',1,'D','D');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Je veille à préserver le calme et les repères de chacun.',2,'S','S');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,pressure_section,truth_scale,'P03','Sous une forte contrainte de temps…',35,'{"mapp_kind":"pressure_duel","source_id":"P03"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Je décide avec les informations disponibles.',1,'D','D');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Je vérifie les points essentiels pour limiter les erreurs.',2,'C','C');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,pressure_section,truth_scale,'P04','Quand la pression monte dans un groupe…',36,'{"mapp_kind":"pressure_duel","source_id":"P04"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Je parle davantage pour relancer la dynamique.',1,'I','I');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Je prends le temps d’écouter et d’apaiser les échanges.',2,'S','S');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,pressure_section,truth_scale,'P05','Quand je dois expliquer une difficulté…',37,'{"mapp_kind":"pressure_duel","source_id":"P05"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Je cherche à rassurer et à susciter la confiance par mon discours.',1,'I','I');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Je présente les faits et les éléments précis.',2,'C','C');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,pressure_section,truth_scale,'P06','Face à une tension entre plusieurs personnes…',38,'{"mapp_kind":"pressure_duel","source_id":"P06"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Je cherche à préserver les relations.',1,'S','S');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Je clarifie les faits pour comprendre le désaccord.',2,'C','C');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,pressure_section,truth_scale,'P07','Quand un projet prend du retard…',39,'{"mapp_kind":"pressure_duel","source_id":"P07"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Je mobilise les autres pour retrouver de l’énergie.',1,'I','I');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Je fixe rapidement de nouvelles priorités.',2,'D','D');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,pressure_section,truth_scale,'P08','Quand quelqu’un ne suit pas le rythme…',40,'{"mapp_kind":"pressure_duel","source_id":"P08"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Je prends le temps de comprendre ses difficultés.',1,'S','S');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Je clarifie les actions attendues.',2,'D','D');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,pressure_section,truth_scale,'P09','Quand une décision présente des risques…',41,'{"mapp_kind":"pressure_duel","source_id":"P09"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Je préfère analyser les conséquences avant de décider.',1,'C','C');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Je préfère agir et ajuster ensuite.',2,'D','D');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,pressure_section,truth_scale,'P10','Quand une situation devient émotionnellement difficile…',42,'{"mapp_kind":"pressure_duel","source_id":"P10"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','J’ai besoin de retrouver du calme et de la stabilité.',1,'S','S');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','J’ai besoin d’en parler pour avancer.',2,'I','I');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,pressure_section,truth_scale,'P11','Quand les informations sont contradictoires…',43,'{"mapp_kind":"pressure_duel","source_id":"P11"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Je vérifie les éléments avant de me prononcer.',1,'C','C');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','J’échange avec les autres pour faire émerger une direction.',2,'I','I');
    insert into mapp.questions(questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position,metadata)
    values(version_id,pressure_section,truth_scale,'P12','Quand un changement important survient sans prévenir…',44,'{"mapp_kind":"pressure_duel","source_id":"P12"}'::jsonb)
    returning id into question_id;
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'A','Je cherche à comprendre précisément ce qui change et pourquoi.',1,'C','C');
    insert into mapp.question_options(question_id,option_key,label,position,plus_code,minus_code)
    values(question_id,'B','Je cherche à retrouver des repères stables.',2,'S','S');
    insert into mapp.scoring_versions(questionnaire_version_id,code,version,status,algorithm,config)
    values(version_id,'profil-mapp-hybrid-44-v1.0.0',1,'draft','mapp-hybrid-44-v1','{"naturalScoringVersion":"natural-hybrid-32-v1.0.0","pressureScoringVersion":"pressure-duels-12-v1.0.0","tieBreakVersion":"profile-descriptions-v1.0.0","psychometricStatus":"experimental_not_validated","scoring":{"natural":{"duel":"1 point to selected option dimension","likert":"value - 1 points to statement dimension (0..3)","raw":"sum of 24 duel points and 8 Likert item points by dimension","max_total":48,"note":"Actual total is 24 plus sum of eight (value-1), varies by participant; no fixed denominator. Equal weight per raw point is experimental and requires validation."},"under_pressure":{"duel":"1 point to selected option dimension","total_before_tiebreak":12},"tiebreak":{"trigger":"Exact tie affecting first or second rank, evaluated separately for natural and pressure","question":"Parmi ces descriptions, laquelle te correspond le mieux ?","descriptions":{"D":"J’aime avoir de l’autonomie, relever des défis et obtenir des résultats.","I":"J’aime créer du lien, partager mon enthousiasme et entraîner les autres.","S":"J’aime la stabilité, la continuité et les relations de confiance.","C":"J’aime comprendre en profondeur, être précis et faire les choses avec méthode."},"options":"Only tied candidates, one mandatory selection","award_points":1,"three_or_four_tied_first":"First choice for primary; second choice among remaining tied candidates for secondary, +1 point each","history":"Preserve pre-tiebreak raw scores and answers; display after-tiebreak percentages","note":"Tie choice is a preference declaration, not additional psychometric evidence"},"percentages":{"method":"score_dimension / sum_of_four_scores * 100","rounding":"largest remainder to one decimal place, ensuring displayed sum = 100.0%","zero_total":"indeterminate, no fabricated percentage"},"rank":"Sort descending after tiebreak; never silently resolve consequential exact ties by fixed D/I/S/C order"}}'::jsonb)
    returning id into scoring_id;
    perform mapp.publish_hybrid_44_versions(version_id,scoring_id);
  else
    select id into scoring_id from mapp.scoring_versions where questionnaire_version_id=version_id and code='profil-mapp-hybrid-44-v1.0.0';
    if scoring_id is null then raise exception 'Official hybrid 44 questionnaire exists without scoring'; end if;
  end if;

  insert into mapp.assessment_sessions(code,title,questionnaire_version_id,scoring_version_id,status,capacity)
  values('ministry-mapp-official-hybrid-44','Profil MAPP officiel',version_id,scoring_id,'published',600)
  on conflict(code) do nothing;
  select id into session_id from mapp.assessment_sessions where code='ministry-mapp-official-hybrid-44';
  if not exists(select 1 from mapp.assessment_sessions where id=session_id and questionnaire_version_id=version_id and scoring_version_id=scoring_id and status='published') then
    raise exception 'Official hybrid 44 session is incompatible';
  end if;
  update mapp.native_settings set assessment_session_id=session_id,enabled=true,updated_at=now() where singleton;
end;
$$;

create or replace function mapp.open_official_hybrid_questionnaire()
returns jsonb language plpgsql security definer set search_path='' as $$
declare base jsonb; attempt_id uuid;
begin
  base := mapp.open_native_questionnaire();
  attempt_id := (base->>'attemptId')::uuid;
  return base || jsonb_build_object(
    'engine','hybrid-44',
    'questions',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',q.id,'code',q.external_key,'position',o.position,'prompt',q.prompt,'metadata',q.metadata,
        'options',coalesce((select jsonb_agg(jsonb_build_object('value',ao.value,'label',ao.label) order by ao.position) from mapp.answer_options ao where ao.scale_id=q.answer_scale_id),'[]'::jsonb),
        'questionOptions',coalesce((select jsonb_agg(jsonb_build_object('id',qo.id,'key',qo.option_key,'label',qo.label,'position',qo.position) order by qo.position) from mapp.question_options qo where qo.question_id=q.id),'[]'::jsonb)
      ) order by o.position)
      from mapp.attempt_question_order o join mapp.questions q on q.id=o.question_id where o.attempt_id=attempt_id
    ),'[]'::jsonb),
    'duelAnswers',coalesce((
      select jsonb_agg(jsonb_build_object('questionId',a.question_id,'optionId',a.selected_option_id,'clientSequence',a.client_sequence))
      from mapp.attempt_duel_answers a where a.attempt_id=attempt_id
    ),'[]'::jsonb)
  );
end $$;

create or replace function public.mapp_open_official_questionnaire()
returns jsonb language sql volatile security definer set search_path='' as $$ select mapp.open_official_hybrid_questionnaire() $$;

create or replace function public.mapp_save_duel_answer(p_attempt_id uuid,p_question_id uuid,p_option_id uuid,p_client_sequence bigint)
returns void language sql volatile security definer set search_path='' as $$
  select mapp.save_forced_choice_duel_answer(p_attempt_id,p_question_id,p_option_id,p_client_sequence)
$$;

create or replace function public.mapp_hybrid_attempt_access(p_attempt_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a mapp.attempts; revision_id uuid;
begin
  select * into a from mapp.attempts where id=p_attempt_id and mapp_private.owns_participant(participant_id);
  if a.id is null then return jsonb_build_object('allowed',false); end if;
  if a.status='completed' then select id into revision_id from mapp.result_revisions where attempt_id=a.id order by revision desc limit 1; end if;
  return jsonb_build_object('allowed',true,'status',a.status,'revisionId',revision_id);
end $$;

revoke all on function mapp.open_official_hybrid_questionnaire() from public,anon,authenticated;
revoke all on function public.mapp_open_official_questionnaire() from public,anon;
revoke all on function public.mapp_save_duel_answer(uuid,uuid,uuid,bigint) from public,anon;
revoke all on function public.mapp_hybrid_attempt_access(uuid) from public,anon;
grant execute on function public.mapp_open_official_questionnaire() to authenticated;
grant execute on function public.mapp_save_duel_answer(uuid,uuid,uuid,bigint) to authenticated;
grant execute on function public.mapp_hybrid_attempt_access(uuid) to authenticated;

commit;

