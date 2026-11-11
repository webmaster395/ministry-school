begin;

-- Les super-administrateurs doivent pouvoir contrôler leur propre restitution
-- avant l'ouverture étudiante de l'outil. Pour tous les autres comptes, le
-- résultat reste conditionné à la publication individuelle et au catalogue.
create or replace function public.get_my_heroes_motors_result()
returns table (
  id uuid,
  first_name text,
  communication_status text,
  portrait text,
  motors jsonb,
  heroes jsonb,
  published_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    r.id,
    r.first_name,
    r.communication_status,
    case when r.communication_status = 'authorized' then r.portrait else null end,
    case when r.communication_status = 'authorized' then r.motors else '[]'::jsonb end,
    case when r.communication_status = 'authorized' then r.heroes else '[]'::jsonb end,
    coalesce(r.published_at, r.updated_at)
  from public.heroes_motors_results r
  where r.user_id = auth.uid()
    and r.communication_status in ('authorized', 'refused')
    and (
      public.is_super_admin()
      or (
        r.publication_status = 'published'
        and r.visible
        and exists (
          select 1 from public.app_catalog a
          where a.slug = 'test-des-heros'
            and a.status = 'published'
            and a.student_enabled
            and (a.student_publish_at is null or a.student_publish_at <= now())
        )
      )
    )
  order by coalesce(r.published_at, r.updated_at) desc
  limit 1;
$$;

revoke all on function public.get_my_heroes_motors_result() from public, anon;
grant execute on function public.get_my_heroes_motors_result() to authenticated;

commit;
