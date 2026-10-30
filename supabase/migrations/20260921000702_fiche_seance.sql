alter table public.sessions add column if not exists summary text;
alter table public.sessions add column if not exists bible_refs text;

update public.sessions set
  summary = 'Découvrir comment Dieu façonne notre vie intérieure et apprendre à lui laisser une place réelle dans notre quotidien.',
  objectives = E'Comprendre l''image biblique de la cuve\nIdentifier ce qui nourrit la vie intérieure\nChoisir un rythme personnel simple',
  bible_refs = 'Jean 15.1–8'
where session_date = '2026-10-03' and description = 'La Cuve';;
