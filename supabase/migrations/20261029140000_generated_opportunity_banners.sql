-- Bannières générées des projets et formations : couleur commune + emoji distinctif.
-- Les anciens fichiers restent conservés en stockage, mais ne sont plus nécessaires à l'affichage.
alter table public.opportunities
  add column if not exists banner_emoji text not null default '✨';

alter table public.opportunities
  drop constraint if exists opportunities_banner_emoji_length;

alter table public.opportunities
  add constraint opportunities_banner_emoji_length
  check (char_length(banner_emoji) between 1 and 16);

comment on column public.opportunities.banner_emoji is
  'Emoji affiché dans la bannière jaune-orangée générée automatiquement.';
