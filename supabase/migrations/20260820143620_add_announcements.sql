
-- Messages d'un enseignant vers un groupe d'étudiants.
-- Diffusion par ministère (et éventuellement par jour), sans passer par l'e-mail.
create table announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  ministry_id uuid references ministries(id),
  day text check (day in ('samedi', 'dimanche')),
  course_id uuid references courses(id) on delete set null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index announcements_ministry_idx on announcements (ministry_id, created_at desc);

alter table announcements enable row level security;

-- L'étudiant voit les annonces de son ministère, tous jours confondus
-- ou celles ciblant précisément son jour.
create policy "announcements readable by targeted students" on announcements
  for select to authenticated using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'student'
        and (announcements.ministry_id is null or p.ministry_id = announcements.ministry_id)
        and (announcements.day is null or p.preferred_day = announcements.day)
    )
  );

create policy "announcements readable by staff" on announcements
  for select to authenticated using (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('teacher', 'admin')
  );

create policy "announcements insertable by author" on announcements
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'role') in ('teacher', 'admin')
  );

create policy "announcements deletable by author" on announcements
  for delete to authenticated using (author_id = auth.uid());
;
