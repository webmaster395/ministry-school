-- Generated from Profil MAPP 202610070008_fix_identity_kind_cast.sql.
-- Do not edit this generated file; update the source migration or transformer.
do $$
declare
  function_definition text;
  old_expression text := 'case when coalesce((auth.jwt() ->> ''is_anonymous'')::boolean, false) then ''anonymous'' else ''email'' end';
  new_expression text := '(case when coalesce((auth.jwt() ->> ''is_anonymous'')::boolean, false) then ''anonymous'' else ''email'' end)::mapp.identity_kind';
begin
  select pg_get_functiondef('mapp.start_session_attempt(text,jsonb,boolean)'::regprocedure)
  into function_definition;

  if strpos(function_definition, old_expression) = 0 then
    raise exception 'start_session_attempt identity expression not found';
  end if;

  execute replace(function_definition, old_expression, new_expression);
end;
$$;
