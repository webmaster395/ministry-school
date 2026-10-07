alter table public.profiles
  add column if not exists is_test_account boolean not null default false,
  add column if not exists test_batch_id uuid;

alter table public.profiles
  drop constraint if exists profiles_test_account_batch_check;

alter table public.profiles
  add constraint profiles_test_account_batch_check check (
    (is_test_account = false and test_batch_id is null)
    or (is_test_account = true and test_batch_id is not null)
  );

create index if not exists profiles_test_batch_idx
  on public.profiles (test_batch_id)
  where is_test_account = true;

comment on column public.profiles.is_test_account is
  'Compte technique exclu des listes, statistiques, exports et communications réelles.';
comment on column public.profiles.test_batch_id is
  'Identifie de façon réversible le lot ayant créé le compte de charge.';

create or replace function public.protect_test_account_marker()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if (new.is_test_account, new.test_batch_id)
      is distinct from
     (old.is_test_account, old.test_batch_id)
     and (select auth.uid()) is not null
     and not public.is_admin() then
    raise exception 'Le marquage des comptes de test est réservé à l’administration.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_test_account_marker on public.profiles;
create trigger protect_test_account_marker
before update of is_test_account, test_batch_id on public.profiles
for each row execute function public.protect_test_account_marker();

-- Même si une vue admin oublie son filtre applicatif, un compte de charge ne peut
-- apparaître dans une lecture de profils effectuée par un autre utilisateur.
drop policy if exists "load test accounts stay isolated" on public.profiles;
create policy "load test accounts stay isolated"
  on public.profiles
  as restrictive
  for select
  to authenticated
  using (
    is_test_account = false
    or id = (select auth.uid())
  );
