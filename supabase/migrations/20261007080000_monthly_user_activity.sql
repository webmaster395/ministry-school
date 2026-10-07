-- Une seule ligne par utilisateur et par mois, alimentée par les connexions Auth.
-- Aucun événement n'est écrit lors de la simple navigation dans l'application.
create table if not exists public.monthly_user_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_month date not null,
  first_sign_in_at timestamptz not null,
  last_sign_in_at timestamptz not null,
  sign_in_count integer not null default 1 check (sign_in_count > 0),
  primary key (user_id, activity_month),
  constraint monthly_user_activity_month_start check (
    activity_month = date_trunc('month', activity_month)::date
  )
);

comment on table public.monthly_user_activity is
  'Activité mensuelle agrégée : au plus une ligne par compte et par mois civil (Europe/Paris).';

alter table public.monthly_user_activity enable row level security;
revoke all on table public.monthly_user_activity from public, anon, authenticated;

create or replace function public.capture_monthly_sign_in()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month date;
begin
  if new.last_sign_in_at is null
     or new.last_sign_in_at is not distinct from old.last_sign_in_at then
    return new;
  end if;

  -- Les comptes de charge ne doivent jamais fausser les statistiques réelles.
  if not exists (
    select 1
    from public.profiles p
    where p.id = new.id
      and p.is_test_account = false
  ) then
    return new;
  end if;

  v_month := date_trunc('month', new.last_sign_in_at at time zone 'Europe/Paris')::date;

  insert into public.monthly_user_activity (
    user_id,
    activity_month,
    first_sign_in_at,
    last_sign_in_at,
    sign_in_count
  ) values (
    new.id,
    v_month,
    new.last_sign_in_at,
    new.last_sign_in_at,
    1
  )
  on conflict (user_id, activity_month) do update
  set last_sign_in_at = greatest(
        public.monthly_user_activity.last_sign_in_at,
        excluded.last_sign_in_at
      ),
      sign_in_count = public.monthly_user_activity.sign_in_count + 1;

  return new;
end;
$$;

drop trigger if exists capture_monthly_sign_in on auth.users;
create trigger capture_monthly_sign_in
after update of last_sign_in_at on auth.users
for each row execute function public.capture_monthly_sign_in();

-- Point de départ : on peut reconstituer avec certitude le mois courant à partir
-- de last_sign_in_at. Aucun historique plus ancien n'est inventé.
insert into public.monthly_user_activity (
  user_id,
  activity_month,
  first_sign_in_at,
  last_sign_in_at,
  sign_in_count
)
select
  u.id,
  date_trunc('month', u.last_sign_in_at at time zone 'Europe/Paris')::date,
  u.last_sign_in_at,
  u.last_sign_in_at,
  1
from auth.users u
join public.profiles p on p.id = u.id
where u.last_sign_in_at is not null
  and p.is_test_account = false
  and (u.last_sign_in_at at time zone 'Europe/Paris') >=
      date_trunc('month', now() at time zone 'Europe/Paris')
on conflict (user_id, activity_month) do nothing;

create or replace function public.admin_monthly_active_users()
returns table(activity_month date, active_users bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs'
      using errcode = '42501';
  end if;

  return query
  select a.activity_month, count(distinct a.user_id)::bigint
  from public.monthly_user_activity a
  join public.profiles p on p.id = a.user_id
  where p.is_test_account = false
  group by a.activity_month
  order by a.activity_month;
end;
$$;

revoke all on function public.admin_monthly_active_users() from public;
grant execute on function public.admin_monthly_active_users() to authenticated;

comment on function public.admin_monthly_active_users() is
  'Nombre mensuel de comptes réels distincts ayant réussi au moins une authentification.';
