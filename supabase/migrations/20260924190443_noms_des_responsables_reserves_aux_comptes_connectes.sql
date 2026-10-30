revoke execute on function public.opportunity_lead(uuid) from public, anon;
revoke execute on function public.opportunity_referent(uuid) from public, anon;
grant execute on function public.opportunity_lead(uuid) to authenticated;
grant execute on function public.opportunity_referent(uuid) to authenticated;;
