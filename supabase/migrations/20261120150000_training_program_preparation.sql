-- Brouillons indépendants du générateur éditorial de programmes.
-- Le payload est un instantané : une synchronisation future des formations sources
-- ne modifie jamais un programme déjà enregistré.

create table if not exists public.training_program_drafts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  program_date date not null,
  day_mode text not null check (day_mode in ('samedi', 'dimanche', 'weekend')),
  payload jsonb not null,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_program_drafts_updated_idx
  on public.training_program_drafts(updated_at desc);

alter table public.training_program_drafts enable row level security;

drop policy if exists training_program_drafts_super_admin_all on public.training_program_drafts;
create policy training_program_drafts_super_admin_all
on public.training_program_drafts for all to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create or replace function public.touch_training_program_draft()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    return new;
  end if;
  new.updated_at := now();
  -- L'auteur d'origine reste immuable pour l'audit.
  new.created_by := old.created_by;
  return new;
end;
$$;

drop trigger if exists touch_training_program_draft on public.training_program_drafts;
create trigger touch_training_program_draft
before insert or update on public.training_program_drafts
for each row execute function public.touch_training_program_draft();

revoke all on public.training_program_drafts from anon;
grant select, insert, update, delete on public.training_program_drafts to authenticated;
