begin;

-- Un participant peut avoir utilisé une adresse de contact différente de son
-- compte Ministry. Le cookie HttpOnly contient déjà le secret fort de la
-- tentative : sa possession permet un rattachement sûr sans rapprochement par
-- e-mail. Aucun secret n'est exposé au navigateur ni stocké en clair.
create or replace function public.mapp_claim_owned_guest_attempt(
  p_attempt_id uuid,
  p_token_hash text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  guest mapp.guest_attempt_access;
  existing_participant uuid;
begin
  if current_user_id is null or not mapp.current_student_is_eligible() then
    raise exception 'MAPP_ACCESS_DENIED' using errcode = '42501';
  end if;

  select * into guest
  from mapp.guest_attempt_access access
  where access.attempt_id = p_attempt_id
    and access.token_hash = p_token_hash
    and access.expires_at > now()
    and (access.claimed_at is null or access.claimed_by = current_user_id)
  for update;

  if guest.attempt_id is null then
    raise exception 'MAPP_CLAIM_DENIED' using errcode = '42501';
  end if;

  select identity_link.participant_id into existing_participant
  from mapp.participant_auth_identities identity_link
  where identity_link.auth_user_id = current_user_id
    and identity_link.revoked_at is null
  limit 1;

  if existing_participant is null then
    insert into mapp.participant_auth_identities(participant_id, auth_user_id, kind)
    values (guest.participant_id, current_user_id, 'email'::mapp.identity_kind);
  elsif existing_participant <> guest.participant_id then
    update mapp.attempts
    set participant_id = existing_participant
    where id = p_attempt_id and participant_id = guest.participant_id;
  end if;

  update mapp.guest_attempt_access
  set claimed_by = current_user_id,
      claimed_at = coalesce(claimed_at, now())
  where attempt_id = p_attempt_id;

  return true;
end;
$$;

revoke all on function public.mapp_claim_owned_guest_attempt(uuid, text) from public, anon;
grant execute on function public.mapp_claim_owned_guest_attempt(uuid, text) to authenticated;

commit;
