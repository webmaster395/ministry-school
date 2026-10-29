-- Donne immédiatement un repère distinct aux éléments historiques.
-- Les administrateurs pourront ensuite choisir un autre emoji dans le formulaire.
with ranked as (
  select id, row_number() over (order by created_at, id) as position
  from public.opportunities
  where banner_emoji = '✨'
)
update public.opportunities as opportunity
set banner_emoji = (array[
  '🎯','🚀','🌱','🤝','💡','🎨','🎤','🧭',
  '🛠️','📚','❤️','🙌','🌍','🏆','🔥','✨'
]::text[])[1 + mod(ranked.position - 1, 16)::integer]
from ranked
where opportunity.id = ranked.id;
