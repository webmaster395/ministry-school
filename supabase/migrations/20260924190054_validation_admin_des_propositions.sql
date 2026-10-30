alter table public.opportunities
  add column if not exists is_validated boolean not null default false,
  add column if not exists validated_at timestamptz,
  add column if not exists validated_by uuid references public.profiles(id);

update public.opportunities
set is_validated = true
where registration_open = true;;
