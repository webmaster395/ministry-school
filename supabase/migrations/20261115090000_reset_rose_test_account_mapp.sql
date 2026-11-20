begin;
-- Réinitialisation strictement ciblée demandée pour le compte de test.
-- Le compte et son lien participant sont conservés afin que le prochain clic
-- sur Profil MAPP crée immédiatement une nouvelle tentative vierge.
do $$
declare
  target_user_id uuid;
  matching_profiles integer;
  matching_participants integer;
  deleted_attempts integer;
begin
  select count(*)
  into matching_profiles
  from public.profiles profile
  where regexp_replace(lower(trim(coalesce(profile.full_name, ''))), '\s+', ' ', 'g') = 'rose compte test';

  if matching_profiles <> 1 then
    raise exception 'RESET_ABORTED: expected exactly one Rose Compte Test profile, found %', matching_profiles;
  end if;

  select profile.id
  into target_user_id
  from public.profiles profile
  where regexp_replace(lower(trim(coalesce(profile.full_name, ''))), '\s+', ' ', 'g') = 'rose compte test';

  select count(distinct identity_link.participant_id)
  into matching_participants
  from mapp.participant_auth_identities identity_link
  where identity_link.auth_user_id = target_user_id;

  if matching_participants > 1 then
    raise exception 'RESET_ABORTED: Rose Compte Test is linked to % MAPP participants', matching_participants;
  end if;

  -- Les tables de scores dépendent des révisions avec ON DELETE CASCADE.
  delete from mapp.result_revisions revision
  using mapp.attempts attempt, mapp.participant_auth_identities identity_link
  where revision.attempt_id = attempt.id
    and attempt.participant_id = identity_link.participant_id
    and identity_link.auth_user_id = target_user_id
    -- Ne jamais supprimer une nouvelle tentative commencée après la demande.
    and attempt.created_at < timestamptz '2026-11-15 18:20:00+01';

  delete from mapp.attempts attempt
  using mapp.participant_auth_identities identity_link
  where attempt.participant_id = identity_link.participant_id
    and identity_link.auth_user_id = target_user_id
    and attempt.created_at < timestamptz '2026-11-15 18:20:00+01';

  get diagnostics deleted_attempts = row_count;

  raise notice 'Rose Compte Test reset completed: % MAPP attempt(s) deleted', deleted_attempts;
end;
$$;
commit;
