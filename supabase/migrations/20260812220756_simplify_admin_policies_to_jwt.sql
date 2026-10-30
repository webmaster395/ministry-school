
drop policy "sessions readable by admin" on sessions;
create policy "sessions readable by admin" on sessions
  for select to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy "materials readable by admin" on materials;
create policy "materials readable by admin" on materials
  for select to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy "assignments readable by admin" on assignments;
create policy "assignments readable by admin" on assignments
  for select to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy "enrollments readable by admin" on enrollments;
create policy "enrollments readable by admin" on enrollments
  for select to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy "submissions readable by admin" on submissions;
create policy "submissions readable by admin" on submissions
  for select to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
;
