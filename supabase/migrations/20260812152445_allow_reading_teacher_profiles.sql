
create policy "profiles teacher names visible to authenticated" on profiles
  for select to authenticated using (role = 'teacher');
;
