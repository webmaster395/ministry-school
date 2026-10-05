create table if not exists public.course_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  content_html text not null default '',
  plain_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, session_id)
);

create index if not exists course_notes_user_updated_idx
  on public.course_notes(user_id, updated_at desc);

alter table public.course_notes enable row level security;

create policy "students read own course notes"
  on public.course_notes for select to authenticated
  using (user_id = auth.uid() and exists (
    select 1 from public.feature_preview_users
    where feature_key = 'course_notes' and user_id = auth.uid()
  ));

create policy "students create own course notes"
  on public.course_notes for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.feature_preview_users
    where feature_key = 'course_notes' and user_id = auth.uid()
  ));

create policy "students update own course notes"
  on public.course_notes for update to authenticated
  using (user_id = auth.uid() and exists (
    select 1 from public.feature_preview_users
    where feature_key = 'course_notes' and user_id = auth.uid()
  ))
  with check (user_id = auth.uid() and exists (
    select 1 from public.feature_preview_users
    where feature_key = 'course_notes' and user_id = auth.uid()
  ));

create policy "students delete own course notes"
  on public.course_notes for delete to authenticated
  using (user_id = auth.uid() and exists (
    select 1 from public.feature_preview_users
    where feature_key = 'course_notes' and user_id = auth.uid()
  ));

insert into public.feature_preview_users (feature_key, user_id)
select 'course_notes', id
from auth.users
where lower(email) = 'r.tamard@gmail.com'
on conflict do nothing;
