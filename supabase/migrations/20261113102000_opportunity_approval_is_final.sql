begin;

-- Une approbation éditoriale est acquise pour toute la durée de vie de la fiche.
-- Les modifications suivantes restent enregistrables, mais un ancien écran ou
-- client ne peut plus remettre le même projet dans la file de validation.
create or replace function public.prevent_opportunity_revalidation()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.status = 'approved' and new.status in ('pending', 'changes_requested') then
    raise exception 'ALREADY_APPROVED';
  end if;
  return new;
end $$;

drop trigger if exists opportunity_approval_is_final on public.opportunity_review_requests;
create trigger opportunity_approval_is_final
before update of status on public.opportunity_review_requests
for each row execute function public.prevent_opportunity_revalidation();

commit;
