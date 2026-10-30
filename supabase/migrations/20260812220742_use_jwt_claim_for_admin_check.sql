
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
  where id = '99999999-9999-9999-9999-999999999999';
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"teacher"}'::jsonb
  where id = '11111111-1111-1111-1111-111111111111';
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"student"}'::jsonb
  where id = '22222222-2222-2222-2222-222222222222';

drop policy "profiles readable by admin" on profiles;

create policy "profiles readable by admin" on profiles
  for select to authenticated using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop function if exists public.current_user_role();
;
