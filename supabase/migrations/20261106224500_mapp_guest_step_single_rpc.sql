begin;

create or replace function mapp.save_guest_hybrid_step(
  p_attempt_id uuid,
  p_token_hash text,
  p_mutation_id uuid,
  p_expected_revision integer,
  p_client_sequence bigint,
  p_scale_answers jsonb,
  p_duel_answers jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not mapp.guest_access_allowed(p_attempt_id, p_token_hash) then
    raise exception 'MAPP_GUEST_ACCESS_DENIED' using errcode = '42501';
  end if;

  return mapp.save_hybrid_step(
    p_attempt_id,
    p_mutation_id,
    p_expected_revision,
    p_client_sequence,
    p_scale_answers,
    p_duel_answers
  );
end;
$$;

revoke all on function mapp.save_guest_hybrid_step(uuid,text,uuid,integer,bigint,jsonb,jsonb)
  from public, anon, authenticated;
grant execute on function mapp.save_guest_hybrid_step(uuid,text,uuid,integer,bigint,jsonb,jsonb)
  to service_role;

comment on function mapp.save_guest_hybrid_step(uuid,text,uuid,integer,bigint,jsonb,jsonb) is
  'Validates the guest attempt secret and saves one four-question hybrid step atomically.';

commit;
