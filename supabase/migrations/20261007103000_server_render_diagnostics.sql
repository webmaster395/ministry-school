create table if not exists public.server_render_diagnostics (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  correlation_id uuid not null,
  route text not null,
  stage text not null,
  error_name text not null,
  error_message text not null,
  error_stack text,
  client_context jsonb,
  deployment_sha text
);

alter table public.server_render_diagnostics enable row level security;

drop policy if exists "admins read server render diagnostics" on public.server_render_diagnostics;
create policy "admins read server render diagnostics"
on public.server_render_diagnostics
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
);

revoke insert, update, delete on public.server_render_diagnostics from anon, authenticated;
grant select on public.server_render_diagnostics to authenticated;

comment on table public.server_render_diagnostics is
  'Journal temporaire et non sensible des exceptions SSR, lisible uniquement par les administrateurs.';
