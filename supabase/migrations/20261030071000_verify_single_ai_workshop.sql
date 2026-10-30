do $$
declare remaining integer;
begin
  select count(*) into remaining
  from public.opportunities
  where lower(trim(title)) = lower(trim('Atelier IA : Création d’images et de miniatures YouTube avec Claude'))
    and publication_status = 'draft'
    and is_project = true
    and is_training = true;
  -- Une base neuve peut ne contenir aucun atelier ; seul un nouveau doublon est anormal.
  if remaining > 1 then
    raise exception 'AI_WORKSHOP_DEDUPLICATION_FAILED: % rows remain', remaining;
  end if;
end $$;
