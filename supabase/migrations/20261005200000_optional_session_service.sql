alter table public.sessions
  add column if not exists service_id uuid references public.services(id) on delete set null;

create index if not exists sessions_service_id_idx on public.sessions(service_id);

comment on column public.sessions.service_id is
  'Service éventuellement associé à un cours Services & Projets.';
