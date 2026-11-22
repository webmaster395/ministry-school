begin;

create table if not exists public.training_synthesis_drafts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  synthesis_date date not null,
  speakers text not null default '',
  payload jsonb not null,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_synthesis_drafts_updated_idx
  on public.training_synthesis_drafts(updated_at desc);

alter table public.training_synthesis_drafts enable row level security;

drop policy if exists training_synthesis_drafts_super_admin_all on public.training_synthesis_drafts;
create policy training_synthesis_drafts_super_admin_all
on public.training_synthesis_drafts for all to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create or replace function public.touch_training_synthesis_draft()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    return new;
  end if;
  new.updated_at := now();
  new.created_by := old.created_by;
  return new;
end;
$$;

drop trigger if exists touch_training_synthesis_draft on public.training_synthesis_drafts;
create trigger touch_training_synthesis_draft
before insert or update on public.training_synthesis_drafts
for each row execute function public.touch_training_synthesis_draft();

revoke all on public.training_synthesis_drafts from anon;
grant select, insert, update, delete on public.training_synthesis_drafts to authenticated;

-- Une seule requête PostgREST alimente les deux bibliothèques de brouillons.
create or replace function public.preparation_drafts_feed()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when not public.is_super_admin() then jsonb_build_object('programs', '[]'::jsonb, 'syntheses', '[]'::jsonb)
    else jsonb_build_object(
      'programs', coalesce((
        select jsonb_agg(to_jsonb(program) order by program.updated_at desc)
        from (
          select id, title, program_date, day_mode, payload, created_by, created_at, updated_at
          from public.training_program_drafts
          order by updated_at desc
          limit 60
        ) program
      ), '[]'::jsonb),
      'syntheses', coalesce((
        select jsonb_agg(to_jsonb(synthesis) order by synthesis.updated_at desc)
        from (
          select id, title, synthesis_date, speakers, payload, created_by, created_at, updated_at
          from public.training_synthesis_drafts
          order by updated_at desc
          limit 60
        ) synthesis
      ), '[]'::jsonb)
    )
  end;
$$;

revoke all on function public.preparation_drafts_feed() from public, anon;
grant execute on function public.preparation_drafts_feed() to authenticated;

commit;
