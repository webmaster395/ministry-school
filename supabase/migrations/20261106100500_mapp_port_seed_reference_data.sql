-- Generated from Profil MAPP 202610070006_seed_reference_data.sql.
-- Do not edit this generated file; update the source migration or transformer.
insert into mapp.dimensions(code, name, color, biblical_figure, position) values
  ('conquerant', 'Conquérant', '#D94B4B', 'Paul', 1),
  ('communiquant', 'Communiquant', '#E7B93E', 'Pierre', 2),
  ('facilitateur', 'Facilitateur', '#55A873', 'Abraham', 3),
  ('analyste', 'Analyste', '#4F78C8', 'Moïse', 4);

insert into mapp.answer_scales(code, name) values ('truth-5', 'Échelle de vérité en cinq positions');

insert into mapp.answer_options(scale_id, value, label, position)
select scale.id, option.value, option.label, option.value
from mapp.answer_scales scale
cross join (values
  (1, 'Pas du tout vrai'),
  (2, 'Plutôt faux'),
  (3, 'Moyennement vrai'),
  (4, 'Plutôt vrai'),
  (5, 'Tout à fait vrai')
) as option(value, label)
where scale.code = 'truth-5';

insert into mapp.profiles(dimension_id, code, name)
select id, code, name from mapp.dimensions;
