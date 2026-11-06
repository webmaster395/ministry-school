begin;

-- Contenu officiel issu de la bibliothèque éditoriale validée. Cette migration
-- crée uniquement la version absente et ne remplace aucune donnée existante.
do $$
declare
  questionnaire uuid;
  questionnaire_version uuid;
  scoring_version uuid;
  answer_scale uuid;
  natural_section uuid;
  pressure_section uuid;
  target_session uuid;
begin
  insert into mapp.questionnaires(code, name, description)
  values ('profil-mapp', 'Profil MAPP', 'Questionnaire officiel Ministry School')
  on conflict (code) do nothing;
  select id into questionnaire from mapp.questionnaires where code = 'profil-mapp';

  select id into questionnaire_version from mapp.questionnaire_versions
  where questionnaire_id = questionnaire and version = 3;

  if questionnaire_version is null then
    insert into mapp.questionnaire_versions(questionnaire_id, version, status, publication_rules, order_strategy)
    values (questionnaire, 3, 'draft', '{"total_questions":50,"section_counts":[{"section":"natural","count":40},{"section":"under_pressure","count":10}],"natural_questions_per_dimension":10,"natural_inverted_questions":13}'::jsonb, 'editorial')
    returning id into questionnaire_version;

    select id into answer_scale from mapp.answer_scales where code = 'truth-5';
    if answer_scale is null then raise exception 'MAPP answer scale truth-5 is missing'; end if;

    insert into mapp.questionnaire_sections(questionnaire_version_id, code, title, context, position)
    values (questionnaire_version, 'natural', 'Comportement naturel', 'natural', 1)
    returning id into natural_section;
    insert into mapp.questionnaire_sections(questionnaire_version_id, code, title, context, position)
    values (questionnaire_version, 'under_pressure', 'Comportement sous pression', 'under_pressure', 2)
    returning id into pressure_section;

  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N34', 'Je peux défendre une décision impopulaire si je pense qu''elle est nécessaire pour atteindre l''objectif.', 1, '{"source_order":34,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N31', 'Lorsqu''un résultat répond globalement à l''objectif, je préfère passer à la suite plutôt que continuer à le perfectionner.', 2, '{"source_order":31,"inverted":true,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N10', 'J''aime partager mes idées, mes expériences ou mon enthousiasme avec les autres.', 3, '{"source_order":10,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, pressure_section, answer_scale, 'P01', 'Quand plusieurs difficultés apparaissent en même temps, je préfère répartir les décisions plutôt que les prendre moi-même.', 4, '{"source_order":41,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N16', 'Lorsque les échanges ralentissent dans un groupe, il m''arrive naturellement de proposer un nouveau sujet ou une nouvelle idée.', 5, '{"source_order":16,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N23', 'Je peux travailler durablement avec quelqu''un sans avoir particulièrement besoin de construire une relation de confiance.', 6, '{"source_order":23,"inverted":true,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N27', 'Lorsque plusieurs informations me sont présentées, je remarque rapidement si certaines ne concordent pas.', 7, '{"source_order":27,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N08', 'Lorsque je travaille sur un projet de longue durée, j''ai besoin de constater régulièrement des avancées concrètes.', 8, '{"source_order":8,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, pressure_section, answer_scale, 'P02', 'Lorsque le temps manque, je réduis généralement les explications pour aller directement à ce qui doit être fait.', 9, '{"source_order":42,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N05', 'Je reste généralement à l''aise lorsqu''une décision importante prend plus de temps que prévu.', 10, '{"source_order":5,"inverted":true,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N36', 'Je trouve plus facilement de nouvelles idées en échangeant avec quelqu''un qu''en réfléchissant seul.', 11, '{"source_order":36,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N21', 'Lorsqu''une personne me parle d''une difficulté, j''ai tendance à prendre le temps de l''écouter avant de lui proposer des solutions.', 12, '{"source_order":21,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N32', 'Lorsque quelqu''un avance une idée, j''ai naturellement tendance à en examiner les avantages, les limites et les conséquences.', 13, '{"source_order":32,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, pressure_section, answer_scale, 'P03', 'Lorsqu''un désaccord devient tendu, je fais davantage attention à la manière dont chacun reçoit les paroles des autres.', 14, '{"source_order":43,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N14', 'Je partage parfois une idée alors que je suis encore en train de réfléchir à la manière de la réaliser.', 15, '{"source_order":14,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N28', 'Lorsque je travaille sur un projet, je peux ajuster mon organisation au fur et à mesure sans plan détaillé.', 16, '{"source_order":28,"inverted":true,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N01', 'Face à un problème nouveau, je préfère commencer par une première action plutôt que d''explorer longtemps toutes les possibilités.', 17, '{"source_order":1,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N30', 'Je peux considérer un travail comme réussi même lorsque les critères de réussite n''ont pas été clairement définis.', 18, '{"source_order":30,"inverted":true,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, pressure_section, answer_scale, 'P04', 'Lorsque les enjeux deviennent importants, je ressens le besoin de réexaminer mes options avant de passer à l''action.', 19, '{"source_order":44,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N25', 'Je peux utiliser efficacement un outil sans ressentir le besoin de comprendre son fonctionnement.', 20, '{"source_order":25,"inverted":true,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N02', 'Lorsque plusieurs possibilités restent ouvertes, j''ai tendance à repousser mon choix jusqu''à ce que la situation se précise.', 21, '{"source_order":2,"inverted":true,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N39', 'Une solution qui fonctionne ne me satisfait pas complètement si je ne comprends pas pourquoi elle fonctionne.', 22, '{"source_order":39,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N15', 'Lorsque je peux réaliser une tâche seul ou avec d''autres, je choisis généralement de la faire seul.', 23, '{"source_order":15,"inverted":true,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, pressure_section, answer_scale, 'P05', 'Lorsqu''une situation échappe à ce que j''avais prévu, je continue souvent à y penser même après avoir pris une décision.', 24, '{"source_order":45,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N17', 'Lorsqu''une personne me raconte une difficulté, je lui pose généralement plusieurs questions avant de lui donner mon avis.', 25, '{"source_order":17,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N12', 'Lorsque je prends la parole dans un groupe, je préfère m''en tenir à ce que j''avais prévu plutôt que développer spontanément de nouvelles idées.', 26, '{"source_order":12,"inverted":true,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N29', 'Lorsqu''on me pose une question qui demande de la réflexion, je préfère généralement prendre quelques instants avant de répondre.', 27, '{"source_order":29,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N09', 'Dans un groupe que je découvre, j''engage généralement une conversation sans attendre qu''on me sollicite.', 28, '{"source_order":9,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, pressure_section, answer_scale, 'P06', 'Dans une situation tendue, je peux parler davantage pour essayer de faire avancer les choses.', 29, '{"source_order":46,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N11', 'Dans une conversation, il m''arrive de partager une idée avant même d''avoir complètement organisé ma pensée.', 30, '{"source_order":11,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N26', 'Même lorsqu''une proposition semble cohérente, j''ai tendance à examiner les situations dans lesquelles elle pourrait ne pas fonctionner.', 31, '{"source_order":26,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N33', 'Lorsqu''un projet avance correctement mais lentement, j''ai tendance à modifier la façon de travailler pour accélérer les résultats.', 32, '{"source_order":33,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N37', 'Lorsque plusieurs personnes ont des attentes différentes, je cherche spontanément une solution dans laquelle chacune pourra se reconnaître.', 33, '{"source_order":37,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, pressure_section, answer_scale, 'P07', 'Face à un conflit, je préfère généralement exprimer rapidement mon désaccord plutôt que prendre du recul.', 34, '{"source_order":47,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N38', 'Je préfère généralement prendre le temps d''accompagner une personne plutôt que de lui demander de s''adapter immédiatement.', 35, '{"source_order":38,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N07', 'Lorsque mon point de vue ne convainc pas les autres, je peux facilement accepter qu''une autre option soit retenue.', 36, '{"source_order":7,"inverted":true,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N13', 'J''ai tendance à voir les possibilités et les opportunités avant les difficultés.', 37, '{"source_order":13,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N18', 'Dans une discussion collective, je remarque généralement qui n''a pas encore eu l''occasion de s''exprimer.', 38, '{"source_order":18,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, pressure_section, answer_scale, 'P08', 'Lorsque la situation devient incertaine, je cherche généralement à confirmer les informations avant de modifier ma manière d''agir.', 39, '{"source_order":48,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N24', 'Lorsqu''une méthode fonctionne, je préfère généralement la conserver tant qu''aucune difficulté importante n''apparaît.', 40, '{"source_order":24,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N35', 'Lorsque je découvre une idée intéressante, j''ai souvent envie d''en parler avant même de savoir si elle est réalisable.', 41, '{"source_order":35,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N20', 'Je retrouve facilement mes repères lorsque mes habitudes changent sans avoir été prévenu.', 42, '{"source_order":20,"inverted":true,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N04', 'Lorsqu''un échange s''éternise, il m''arrive de proposer une conclusion même si tous les points n''ont pas été explorés.', 43, '{"source_order":4,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, pressure_section, answer_scale, 'P09', 'Lorsqu''une situation devient urgente, je peux décider seul alors qu''en temps normal, j''aurais consulté les autres.', 44, '{"source_order":49,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N22', 'Dans un projet de groupe, je peux accepter des tensions temporaires si elles permettent d''obtenir un résultat plus satisfaisant.', 45, '{"source_order":22,"inverted":true,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N03', 'Lorsque je termine un objectif plus facilement que prévu, j''ai tendance à relever spontanément le niveau d''exigence.', 46, '{"source_order":3,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N19', 'Avant de modifier une organisation collective, j''aime savoir comment les personnes concernées vivent la situation actuelle.', 47, '{"source_order":19,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N06', 'Avant d''essayer une nouvelle manière de faire, j''aime savoir quelles seront les principales étapes.', 48, '{"source_order":6,"inverted":true,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, pressure_section, answer_scale, 'P10', 'Lorsque je me sens dépassé, j''ai tendance à multiplier les échanges pour clarifier ce que je dois faire.', 49, '{"source_order":50,"inverted":false,"weight":1}'::jsonb);
  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, natural_section, answer_scale, 'N40', 'Lorsqu''une information contredit ce que je pensais, j''ai tendance à réexaminer mon raisonnement avant de changer d''avis.', 50, '{"source_order":40,"inverted":false,"weight":1}'::jsonb);

    insert into mapp.scoring_versions(questionnaire_version_id, code, version, status, algorithm, config)
    values (questionnaire_version, 'natural-v3', 3, 'draft', 'weighted-likert',
      '{"expected_natural_inverted":13,"expected_natural_per_dimension":10,"expected_natural_dimensions":4}'::jsonb)
    returning id into scoring_version;

  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N34'
    and dimension.code = 'conquerant';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, -1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N31'
    and dimension.code = 'analyste';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N10'
    and dimension.code = 'communiquant';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N16'
    and dimension.code = 'communiquant';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, -1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N23'
    and dimension.code = 'facilitateur';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N27'
    and dimension.code = 'analyste';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N08'
    and dimension.code = 'conquerant';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, -1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N05'
    and dimension.code = 'conquerant';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N36'
    and dimension.code = 'communiquant';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N21'
    and dimension.code = 'facilitateur';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N32'
    and dimension.code = 'analyste';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N14'
    and dimension.code = 'communiquant';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, -1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N28'
    and dimension.code = 'analyste';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N01'
    and dimension.code = 'conquerant';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, -1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N30'
    and dimension.code = 'analyste';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, -1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N25'
    and dimension.code = 'analyste';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, -1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N02'
    and dimension.code = 'conquerant';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N39'
    and dimension.code = 'analyste';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, -1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N15'
    and dimension.code = 'communiquant';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N17'
    and dimension.code = 'facilitateur';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, -1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N12'
    and dimension.code = 'communiquant';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N29'
    and dimension.code = 'analyste';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N09'
    and dimension.code = 'communiquant';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N11'
    and dimension.code = 'communiquant';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N26'
    and dimension.code = 'analyste';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N33'
    and dimension.code = 'conquerant';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N37'
    and dimension.code = 'facilitateur';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N38'
    and dimension.code = 'facilitateur';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, -1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N07'
    and dimension.code = 'conquerant';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N13'
    and dimension.code = 'communiquant';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N18'
    and dimension.code = 'facilitateur';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N24'
    and dimension.code = 'facilitateur';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N35'
    and dimension.code = 'communiquant';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, -1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N20'
    and dimension.code = 'facilitateur';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N04'
    and dimension.code = 'conquerant';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, -1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N22'
    and dimension.code = 'facilitateur';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N03'
    and dimension.code = 'conquerant';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N19'
    and dimension.code = 'facilitateur';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, -1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N06'
    and dimension.code = 'conquerant';
  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, 1, 1
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = 'N40'
    and dimension.code = 'analyste';

    perform mapp.publish_questionnaire_version(questionnaire_version);
    perform mapp.publish_scoring_version(scoring_version);
  else
    select id into scoring_version from mapp.scoring_versions
    where questionnaire_version_id = questionnaire_version and code = 'natural-v3' and version = 3;
    if scoring_version is null then
      raise exception 'MAPP questionnaire v3 exists without its expected scoring version';
    end if;
  end if;

  insert into mapp.assessment_sessions(code, title, questionnaire_version_id, scoring_version_id, status, capacity)
  values ('ministry-mapp-2026-11-07', 'Profil MAPP Ministry School', questionnaire_version, scoring_version, 'published', 600)
  on conflict (code) do nothing;
  select id into target_session from mapp.assessment_sessions where code = 'ministry-mapp-2026-11-07';

  if not exists (
    select 1 from mapp.assessment_sessions
    where id = target_session
      and questionnaire_version_id = questionnaire_version
      and scoring_version_id = scoring_version
      and status = 'published'
  ) then
    raise exception 'Existing Ministry MAPP session is incompatible';
  end if;

  -- La session technique est sélectionnée, mais la publication étudiante reste
  -- entièrement pilotée par app_catalog et la porte serveur de la migration 140000.
  update mapp.native_settings
  set assessment_session_id = target_session, enabled = true, updated_at = now()
  where singleton;
end;
$$;

commit;
