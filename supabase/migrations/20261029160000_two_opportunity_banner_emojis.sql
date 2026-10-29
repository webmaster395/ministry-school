-- Autorise deux emojis, y compris les séquences composées (familles, drapeaux, tons de peau).
alter table public.opportunities
  drop constraint if exists opportunities_banner_emoji_length;

alter table public.opportunities
  add constraint opportunities_banner_emoji_length
  check (char_length(banner_emoji) between 1 and 32);
