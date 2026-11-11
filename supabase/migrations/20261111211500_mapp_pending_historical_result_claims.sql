-- Keep selected historical MAPP results inside Ministry before their owner
-- creates an account. The auth trigger claims only an exact normalized email.

create table if not exists mapp.pending_historical_result_claims (
  id uuid primary key default gen_random_uuid(),
  email text not null check (btrim(email) <> ''),
  normalized_email text generated always as (lower(btrim(email))) stored,
  participant_id uuid not null unique references mapp.participants(id) on delete restrict,
  source_project text not null,
  source_participant_id uuid,
  source_attempt_ids uuid[] not null default '{}'::uuid[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by uuid references auth.users(id) on delete set null,
  last_error text,
  unique (normalized_email)
);

alter table mapp.pending_historical_result_claims enable row level security;
revoke all on table mapp.pending_historical_result_claims from public, anon, authenticated;

create or replace function mapp_private.claim_pending_historical_results_for_user(
  target_user_id uuid,
  target_email text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  pending_claim mapp.pending_historical_result_claims%rowtype;
  existing_identity mapp.participant_auth_identities%rowtype;
begin
  if target_user_id is null or nullif(btrim(target_email), '') is null then
    return false;
  end if;

  select * into pending_claim
  from mapp.pending_historical_result_claims claim
  where claim.normalized_email = lower(btrim(target_email))
    and claim.claimed_at is null
  for update;

  if pending_claim.id is null then
    return false;
  end if;

  select * into existing_identity
  from mapp.participant_auth_identities identity_link
  where identity_link.auth_user_id = target_user_id
  limit 1;

  if existing_identity.id is not null
     and existing_identity.participant_id <> pending_claim.participant_id then
    update mapp.pending_historical_result_claims
    set last_error = 'Le compte possède déjà un participant MAPP différent.'
    where id = pending_claim.id;
    return false;
  end if;

  if existing_identity.id is null then
    insert into mapp.participant_auth_identities(
      participant_id,
      auth_user_id,
      kind,
      issuer,
      subject,
      linked_at,
      revoked_at
    ) values (
      pending_claim.participant_id,
      target_user_id,
      'email'::mapp.identity_kind,
      'https://jrdjqkvagnqpchygxrkz.supabase.co/auth/v1',
      target_user_id::text,
      now(),
      null
    );
  else
    update mapp.participant_auth_identities
    set revoked_at = null,
        linked_at = now(),
        issuer = coalesce(issuer, 'https://jrdjqkvagnqpchygxrkz.supabase.co/auth/v1'),
        subject = coalesce(subject, target_user_id::text)
    where id = existing_identity.id;
  end if;

  update mapp.participant_profiles
  set email = target_email,
      updated_at = now()
  where participant_id = pending_claim.participant_id;

  update mapp.pending_historical_result_claims
  set claimed_at = now(),
      claimed_by = target_user_id,
      last_error = null
  where id = pending_claim.id;

  return true;
end;
$$;

revoke all on function mapp_private.claim_pending_historical_results_for_user(uuid, text) from public, anon, authenticated;

create or replace function mapp_private.claim_pending_historical_results_on_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform mapp_private.claim_pending_historical_results_for_user(new.id, new.email);
  return new;
end;
$$;

revoke all on function mapp_private.claim_pending_historical_results_on_auth_user() from public, anon, authenticated;

drop trigger if exists claim_pending_mapp_results on auth.users;
create trigger claim_pending_mapp_results
after insert or update of email on auth.users
for each row execute function mapp_private.claim_pending_historical_results_on_auth_user();

comment on table mapp.pending_historical_result_claims is
  'Selected historical MAPP results waiting for an exact Ministry account email.';
