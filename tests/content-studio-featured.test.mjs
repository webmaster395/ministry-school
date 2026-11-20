import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("Gestion des outils sépare informations, apparence, emplacements, accès et publication",async()=>{
  const [form,actions]=await Promise.all([read("src/components/apps-studio/AppSettingsForm.tsx"),read("src/app/admin/apps/actions.ts")]);
  for(const section of ["Informations","Apparence","Emplacements","Accès","Publication"])assert.match(form,new RegExp(`title="${section}"`));
  assert.match(form,/storyImage/); assert.match(form,/postImage/); assert.match(form,/resourceImage/);
  assert.match(actions,/placement_story/); assert.match(actions,/access_scope/); assert.match(actions,/featured_start_at/);
});

test("la mise à la une est individuelle et ne modifie pas la réalisation",async()=>{
  const [migration,toolRoute,resourceRoute,home]=await Promise.all([read("supabase/migrations/20261113183000_content_studio_featured_dashboard.sql"),read("src/app/etudiant/outils/[slug]/ouvrir/route.ts"),read("src/app/etudiant/ressources/gerees/[id]/ouvrir/route.ts"),read("src/app/etudiant/page.tsx")]);
  assert.match(migration,/primary key\(content_type,content_id,user_id,generation\)/);
  assert.match(toolRoute,/featured_content_views/); assert.match(resourceRoute,/featured_content_views/);
  assert.doesNotMatch(toolRoute,/completed/); assert.match(home,/À ne pas manquer/); assert.match(home,/bg-\[#b42318\]/);
});

test("les ressources gérées réutilisent la RLS et la bibliothèque étudiante",async()=>{
  const [migration,library,route]=await Promise.all([read("supabase/migrations/20261113183000_content_studio_featured_dashboard.sql"),read("src/lib/data/resource-library.ts"),read("src/app/etudiant/ressources/gerees/[id]/ouvrir/route.ts")]);
  assert.match(migration,/can_access_managed_resource/); assert.match(migration,/access_scope='present'/);
  assert.match(library,/from\("managed_resources"\)/); assert.match(route,/createSignedUrl/);
});
