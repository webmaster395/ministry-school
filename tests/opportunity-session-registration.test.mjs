import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("les inscriptions sont indépendantes par séance et atomiques", async () => {
  const sql = await source("supabase/migrations/20261029130000_opportunity_sessions_and_daily_digest.sql");
  assert.match(sql, /create table if not exists public\.opportunity_date_registrations/);
  assert.match(sql, /primary key \(opportunity_date_id, user_id\)/);
  assert.match(sql, /order by od\.id for update/);
  assert.match(sql, /CAPACITY_REACHED/);
  assert.match(sql, /cancel_opportunity_date_registration/);
});

test("la fiche étudiante permet une sélection multiple et une annulation ciblée", async () => {
  const page = await source("src/app/etudiant/services/[id]/page.tsx");
  const actions = await source("src/app/etudiant/services/actions.ts");
  assert.match(page, /name="date_ids"/);
  assert.match(page, /registerOpportunityDates/);
  assert.match(page, /formAction=\{cancelOpportunityDate\}/);
  assert.match(page, /place.*restante/s);
  assert.match(actions, /register_for_opportunity_dates/);
  assert.match(actions, /cancel_opportunity_date_registration/);
});

test("le formulaire simplifié conserve uniquement les informations métier attendues", async () => {
  const form = await source("src/components/admin/OpportunityCreateForm.tsx");
  assert.match(form, /name="service_name" list="service-suggestions"/);
  assert.match(form, /DynamicListInput name="objectives_items"/);
  assert.match(form, /DynamicListInput name="speakers_items"/);
  assert.match(form, /DynamicListInput name="prerequisites_items"/);
  assert.match(form, /DynamicListInput name="participant_material_items"/);
  assert.match(form, /OpportunityEmojiPicker/);
  assert.doesNotMatch(form, /name="cover_image"/);
  assert.doesNotMatch(form, /name="short_description"/);
  assert.doesNotMatch(form, /name="organization_material"/);
  assert.doesNotMatch(form, /name="schedule_label"/);
});

test("la bannière reprend le style des cours avec un accent jaune-orange et un emoji persistant", async () => {
  const [banner, picker, migration, backfill] = await Promise.all([
    source("src/components/OpportunityBanner.tsx"),
    source("src/components/OpportunityEmojiPicker.tsx"),
    source("supabase/migrations/20261029140000_generated_opportunity_banners.sql"),
    source("supabase/migrations/20261029150000_backfill_opportunity_banner_emojis.sql"),
  ]);
  assert.match(banner, /#202927/);
  assert.match(banner, /#FFD45A/);
  assert.match(banner, /#F28A24/);
  assert.match(banner, /Apple Color Emoji/);
  assert.match(picker, /type="text"/);
  assert.match(picker, /name="banner_emoji"/);
  assert.doesNotMatch(picker, /role="radiogroup"/);
  assert.match(migration, /add column if not exists banner_emoji/);
  assert.match(backfill, /row_number\(\) over/);
});

test("le nombre de week-ends et les intervenants en ligne sont visibles côté étudiant", async () => {
  const page = await source("src/app/etudiant/services/[id]/page.tsx");
  assert.match(page, /new Set\(dates\.map\(\(date\) => weekendKey/);
  assert.match(page, /week-end/);
  assert.match(page, /speakers\.join\(" • "\)/);
});

