-- Generated from Profil MAPP 202610070011_published_scoring_versions_read.sql.
-- Do not edit this generated file; update the source migration or transformer.
create policy published_scoring_versions_read
on mapp.scoring_versions
for select
to authenticated
using (status = 'published');

grant select on mapp.scoring_versions to authenticated;

comment on policy published_scoring_versions_read on mapp.scoring_versions is
  'Participants may read published scoring metadata required to render their own result.';
