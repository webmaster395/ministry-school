begin;

-- Rattache automatiquement une restitution non attribuée quand le compte
-- Ministry correspondant existe enfin. La comparaison reste strictement
-- insensible à la casse et aucun compte possédant déjà un résultat n'est écrasé.
create or replace function public.claim_heroes_motors_result_for_user(
  target_user_id uuid,
  target_email text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_id uuid;
begin
  if target_user_id is null or nullif(btrim(target_email), '') is null then
    return false;
  end if;
  if not exists(select 1 from public.profiles where id = target_user_id) then
    return false;
  end if;
  if exists(select 1 from public.heroes_motors_results where user_id = target_user_id) then
    return false;
  end if;

  with candidate as (
    select r.id,
      coalesce((
        select jsonb_agg(item)
        from jsonb_array_elements(r.anomalies) item
        where item <> '"account_not_found"'::jsonb
      ), '[]'::jsonb) as cleaned_anomalies
    from public.heroes_motors_results r
    where r.user_id is null
      and lower(btrim(r.source_email)) = lower(btrim(target_email))
    order by r.source_submitted_at desc nulls last, r.created_at desc
    limit 1
    for update
  ), claimed as (
    update public.heroes_motors_results r
    set user_id = target_user_id,
        assignment_status = 'assigned',
        anomalies = candidate.cleaned_anomalies,
        validation_status = case when jsonb_array_length(candidate.cleaned_anomalies) = 0 then 'validated' else 'pending' end,
        assignment_note = 'Rattachement automatique à la création du compte Ministry',
        updated_at = now()
    from candidate
    where r.id = candidate.id
    returning r.id
  )
  select id into claimed_id from claimed;

  return claimed_id is not null;
end;
$$;

revoke all on function public.claim_heroes_motors_result_for_user(uuid, text) from public, anon, authenticated;

create or replace function public.claim_heroes_motors_result_on_auth_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.claim_heroes_motors_result_for_user(new.id, new.email);
  return new;
end;
$$;

revoke all on function public.claim_heroes_motors_result_on_auth_email() from public, anon, authenticated;

drop trigger if exists claim_pending_heroes_result_on_auth on auth.users;
create trigger claim_pending_heroes_result_on_auth
after insert or update of email on auth.users
for each row execute function public.claim_heroes_motors_result_on_auth_email();

create or replace function public.claim_heroes_motors_result_on_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  account_email text;
begin
  select email into account_email from auth.users where id = new.id;
  perform public.claim_heroes_motors_result_for_user(new.id, account_email);
  return new;
end;
$$;

revoke all on function public.claim_heroes_motors_result_on_profile() from public, anon, authenticated;

drop trigger if exists claim_pending_heroes_result_on_profile on public.profiles;
create trigger claim_pending_heroes_result_on_profile
after insert on public.profiles
for each row execute function public.claim_heroes_motors_result_on_profile();

update public.app_catalog
set icon_url = '/identity/heroes/dove-abstract-v1.webp'
where slug = 'test-des-heros';

commit;
