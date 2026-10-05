-- Expérience pédagogique enrichie et annuaire centralisé des formateurs.
-- Cette migration conserve teacher_id et speaker_name pour la compatibilité avec l'existant.

create table if not exists public.trainers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  first_name text not null,
  last_name text not null default '',
  title text,
  bio text,
  photo_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.session_trainers (
  session_id uuid not null references public.sessions(id) on delete cascade,
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (session_id, trainer_id)
);

create table if not exists public.feature_preview_users (
  feature_key text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (feature_key, user_id)
);

-- Résout une seule fois l'adresse vers l'UUID fiable de Supabase Auth.
insert into public.feature_preview_users (feature_key, user_id)
select 'new_course_experience', id
from auth.users
where lower(trim(email)) = 'r.tamard@gmail.com'
on conflict (feature_key, user_id) do nothing;

create index if not exists session_trainers_session_position_idx
  on public.session_trainers(session_id, position);

alter table public.sessions add column if not exists video_url text;
alter table public.sessions add column if not exists cover_image_path text;
alter table public.materials add column if not exists description text;
alter table public.materials add column if not exists sort_order integer not null default 0;
alter table public.assignments add column if not exists title text;
alter table public.assignments add column if not exists description text;
alter table public.assignments add column if not exists content_type text;
alter table public.assignments add column if not exists resource_url text;
alter table public.assignments add column if not exists file_url text;
alter table public.assignments add column if not exists phase text check (phase in ('before', 'after'));
alter table public.assignments add column if not exists sort_order integer not null default 0;
alter table public.announcements add column if not exists is_system boolean not null default false;

-- Les messages rédigés depuis l'espace Communication portent sent_as. Les annonces sans
-- sent_as sont produites par la plateforme : author_id reste l'acteur réel pour l'audit.
update public.announcements set is_system = true where sent_as is null;

create or replace function public.classify_announcement_sender()
returns trigger language plpgsql as $$
begin
  if new.sent_as is null then new.is_system := true; end if;
  return new;
end;
$$;
drop trigger if exists classify_announcement_sender on public.announcements;
create trigger classify_announcement_sender
before insert or update of sent_as on public.announcements
for each row execute function public.classify_announcement_sender();

alter table public.trainers enable row level security;
alter table public.session_trainers enable row level security;
alter table public.feature_preview_users enable row level security;

drop policy if exists "users read their own feature previews" on public.feature_preview_users;
create policy "users read their own feature previews"
on public.feature_preview_users for select to authenticated
using (user_id = auth.uid());

drop policy if exists "trainers readable by authenticated users" on public.trainers;
create policy "trainers readable by authenticated users"
on public.trainers for select to authenticated using (true);

drop policy if exists "trainers managed by admins" on public.trainers;
create policy "trainers managed by admins"
on public.trainers for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "session trainers readable by authenticated users" on public.session_trainers;
create policy "session trainers readable by authenticated users"
on public.session_trainers for select to authenticated using (true);

create or replace function public.is_linked_session_trainer(target_session uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.session_trainers st
    join public.trainers t on t.id = st.trainer_id
    where st.session_id = target_session and t.profile_id = auth.uid()
  );
$$;

drop policy if exists "linked trainers update their sessions" on public.sessions;
create policy "linked trainers update their sessions"
on public.sessions for update to authenticated
using (public.is_linked_session_trainer(id))
with check (public.is_linked_session_trainer(id));

drop policy if exists "linked trainers manage session materials" on public.materials;
create policy "linked trainers manage session materials"
on public.materials for all to authenticated
using (public.is_linked_session_trainer(session_id))
with check (public.is_linked_session_trainer(session_id));

drop policy if exists "linked trainers manage session assignments" on public.assignments;
create policy "linked trainers manage session assignments"
on public.assignments for all to authenticated
using (public.is_linked_session_trainer(session_id))
with check (public.is_linked_session_trainer(session_id));

drop policy if exists "session trainers managed by authorized staff" on public.session_trainers;
create policy "session trainers managed by authorized staff"
on public.session_trainers for all to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or exists (select 1 from public.sessions s where s.id = session_id and s.teacher_id = auth.uid())
  or public.is_linked_session_trainer(session_id)
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or exists (select 1 from public.sessions s where s.id = session_id and s.teacher_id = auth.uid())
  or public.is_linked_session_trainer(session_id)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trainer-photos',
  'trainer-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "trainer photos public read" on storage.objects;
create policy "trainer photos public read"
on storage.objects for select using (bucket_id = 'trainer-photos');

drop policy if exists "trainer photos admin upload" on storage.objects;
create policy "trainer photos admin upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'trainer-photos'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "trainer photos admin update" on storage.objects;
create policy "trainer photos admin update"
on storage.objects for update to authenticated
using (
  bucket_id = 'trainer-photos'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (bucket_id = 'trainer-photos');

drop policy if exists "trainer photos admin delete" on storage.objects;
create policy "trainer photos admin delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'trainer-photos'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Crée une fiche centralisée pour les formateurs déjà liés aux séances.
insert into public.trainers (profile_id, first_name, last_name)
select
  p.id,
  split_part(coalesce(nullif(trim(p.full_name), ''), 'Formateur'), ' ', 1),
  trim(substr(coalesce(nullif(trim(p.full_name), ''), 'Formateur'), length(split_part(coalesce(nullif(trim(p.full_name), ''), 'Formateur'), ' ', 1)) + 1))
from public.profiles p
where p.is_teacher = true
on conflict (profile_id) do nothing;

insert into public.session_trainers (session_id, trainer_id, position)
select s.id, t.id, 0
from public.sessions s
join public.trainers t on t.profile_id = s.teacher_id
where s.teacher_id is not null
on conflict (session_id, trainer_id) do nothing;
