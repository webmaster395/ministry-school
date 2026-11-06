import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");
const defaultPgliteModule = resolve(
  projectDirectory,
  "../../../phase-3e-workspace/profil-mapp/node_modules/@electric-sql/pglite/dist/index.js",
);
const pgliteModule = process.env.PGLITE_MODULE_PATH || defaultPgliteModule;
const { PGlite } = await import(pathToFileURL(pgliteModule).href);

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectFailure(label, action, pattern) {
  try {
    await action();
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    if (pattern && !pattern.test(message)) throw new Error(`${label}: erreur inattendue: ${message}`);
    return message;
  }
  throw new Error(`${label}: l'operation aurait du etre refusee`);
}

async function one(db, sql, params = []) {
  const result = await db.query(sql, params);
  if (!result.rows[0]) throw new Error(`Aucune ligne retournee: ${sql.slice(0, 100)}`);
  return result.rows[0];
}

function claims(userId, email) {
  return JSON.stringify({
    sub: userId,
    role: "authenticated",
    email,
    iss: "https://validation.invalid/auth/v1",
  });
}

async function useIdentity(db, userId, email) {
  await db.exec("reset role");
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claims',$2,false)",
    [userId, claims(userId, email)],
  );
  await db.exec("set role authenticated");
}

const db = new PGlite();
await db.waitReady;

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key, email text unique);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
    $$;
    create schema extensions;
    create function extensions.digest(data text, algorithm text) returns bytea language sql immutable as $$
      select decode(md5(data), 'hex')
    $$;
    create table public.profiles(
      id uuid primary key references auth.users(id) on delete cascade,
      full_name text not null,
      role text not null check (role in ('student', 'teacher', 'admin')),
      email_confirmed boolean not null default false,
      deactivated boolean not null default false,
      created_at timestamptz not null default now()
    );
    create table public.grace_identity_assessments(
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references public.profiles(id) on delete cascade,
      test_key text not null,
      answers jsonb not null default '{}'::jsonb,
      results jsonb not null default '{}'::jsonb,
      completed_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(user_id,test_key)
    );
  `);

  const migrationDirectory = resolve(projectDirectory, "supabase/migrations");
  const migrations = (await readdir(migrationDirectory))
    .filter((name) => /_mapp_port_|native_mapp_ministry_access_and_batching|student_identity_dashboard|mapp_secure_guest_attempts/.test(name) && name.endsWith(".sql"))
    .sort();

  for (const migration of migrations) {
    const original = await readFile(resolve(migrationDirectory, migration), "utf8");
    const compatible = original.replace("create extension if not exists pgcrypto with schema extensions;", "");
    try {
      await db.exec(compatible);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      throw new Error(`${migration}: ${message}`, { cause });
    }
  }

  const questionnaire = await one(db, `
    insert into mapp.questionnaires(code,name,description)
    values ('ministry-native-50','Profil MAPP validation','Jeu synthetique de validation')
    returning id
  `);
  const questionnaireVersion = await one(db, `
    insert into mapp.questionnaire_versions(
      questionnaire_id,version,status,publication_rules,order_strategy,published_at
    ) values ($1,1,'draft','{"total_questions":50}'::jsonb,'editorial',null)
    returning id
  `, [questionnaire.id]);
  const section = await one(db, `
    insert into mapp.questionnaire_sections(questionnaire_version_id,code,title,context,position)
    values ($1,'natural','Profil naturel','natural',1)
    returning id
  `, [questionnaireVersion.id]);
  const scoringVersion = await one(db, `
    insert into mapp.scoring_versions(
      questionnaire_version_id,code,version,status,algorithm,config,published_at
    ) values ($1,'ministry-native-validation',1,'draft','weighted-likert','{}'::jsonb,null)
    returning id
  `, [questionnaireVersion.id]);
  const scale = await one(db, "select id from mapp.answer_scales where code='truth-5'");

  await db.query(`
    insert into mapp.questions(
      questionnaire_version_id,section_id,answer_scale_id,external_key,prompt,editorial_position
    )
    select $1,$2,$3,'Q-' || lpad(value::text,2,'0'),
      'Affirmation synthetique ' || value,value
    from generate_series(1,50) value
  `, [questionnaireVersion.id, section.id, scale.id]);
  await db.query(`
    insert into mapp.scoring_question_rules(scoring_version_id,question_id,dimension_id,direction,weight)
    select $1,question.id,dimension.id,1,1
    from mapp.questions question
    join mapp.dimensions dimension
      on dimension.position = ((question.editorial_position - 1) % 4) + 1
    where question.questionnaire_version_id = $2
  `, [scoringVersion.id, questionnaireVersion.id]);
  await db.query(
    "update mapp.questionnaire_versions set status='published',published_at=now() where id=$1",
    [questionnaireVersion.id],
  );
  await db.query(
    "update mapp.scoring_versions set status='published',published_at=now() where id=$1",
    [scoringVersion.id],
  );
  const session = await one(db, `
    insert into mapp.assessment_sessions(
      code,title,questionnaire_version_id,scoring_version_id,status,consent_required
    ) values ('ministry-native-validation','Profil MAPP Ministry',$1,$2,'published',false)
    returning id
  `, [questionnaireVersion.id, scoringVersion.id]);
  await db.query(`
    update mapp.native_settings
    set assessment_session_id=$1,enabled=true,updated_at=now()
    where singleton
  `, [session.id]);

  const studentId = randomUUID();
  const studentEmail = "student-eligible@example.invalid";
  await db.query("insert into auth.users(id,email) values($1,$2)", [studentId, studentEmail]);
  await db.query(`
    insert into public.profiles(id,full_name,role,email_confirmed,deactivated)
    values($1,'Etudiant Eligible','student',true,false)
  `, [studentId]);
  await useIdentity(db, studentId, studentEmail);

  const opened = await one(db, "select public.mapp_open_questionnaire() payload");
  const context = opened.payload;
  ensure(context.questions.length === 50, `50 questions attendues, recu ${context.questions.length}`);
  ensure(context.answers.length === 0, "Une nouvelle tentative ne doit avoir aucune reponse");

  const mutationIds = [];
  let revision = context.serverRevision;
  for (let offset = 0; offset < context.questions.length; offset += 5) {
    const mutationId = randomUUID();
    mutationIds.push(mutationId);
    const answers = context.questions.slice(offset, offset + 5).map((question, index) => ({
      questionId: question.id,
      value: ((offset + index) % 5) + 1,
    }));
    const saved = await one(db, `
      select public.mapp_save_answer_batch($1,$2,$3,$4,$5::jsonb) payload
    `, [context.attemptId, mutationId, revision, offset + 5, JSON.stringify(answers)]);
    ensure(saved.payload.answerCount === 5, "Chaque lot doit confirmer cinq reponses");
    revision = saved.payload.serverRevision;
  }
  ensure(revision === 10, `La revision serveur attendue est 10, recue ${revision}`);

  const firstAnswers = context.questions.slice(0, 5).map((question, index) => ({
    questionId: question.id,
    value: (index % 5) + 1,
  }));
  const replay = await one(db, `
    select public.mapp_save_answer_batch($1,$2,0,5,$3::jsonb) payload
  `, [context.attemptId, mutationIds[0], JSON.stringify(firstAnswers)]);
  ensure(replay.payload.serverRevision === 1, "Le rejeu idempotent doit renvoyer l'accuse original");

  await expectFailure(
    "revision obsolete",
    () => db.query("select public.mapp_save_answer_batch($1,$2,0,51,$3::jsonb)", [
      context.attemptId,
      randomUUID(),
      JSON.stringify([{ questionId: context.questions[0].id, value: 5 }]),
    ]),
    /MAPP_REVISION_CONFLICT/,
  );

  const finalized = await one(db, "select public.mapp_finalize_attempt($1) payload", [context.attemptId]);
  ensure(finalized.payload.bundle.scores.length === 4, "Quatre scores de dimensions attendus");
  const finalizedAgain = await one(db, "select public.mapp_finalize_attempt($1) payload", [context.attemptId]);
  ensure(
    finalizedAgain.payload.resultRevisionId === finalized.payload.resultRevisionId,
    "La finalisation repetee doit etre idempotente",
  );
  const result = await one(db, "select public.mapp_get_results($1) payload", [context.attemptId]);
  ensure(result.payload.resultRevisionId === finalized.payload.resultRevisionId, "La restitution doit viser la revision finalisee");

  await db.exec("reset role");
  await db.query("update mapp.result_dimension_scores set percentage=50 where result_revision_id=$1 and context='natural'", [finalized.payload.resultRevisionId]);
  await useIdentity(db, studentId, "student@example.invalid");
  const tieAnswers = [
    { questionId: "tie-01", selectedCode: "conquerant" },
    { questionId: "tie-02", selectedCode: "conquerant" },
    { questionId: "tie-03", selectedCode: "analyste" },
  ];
  const tieResolved = await one(db, "select public.mapp_submit_tie_break($1,$2,$3::jsonb) payload", [context.attemptId, finalized.payload.resultRevisionId, JSON.stringify(tieAnswers)]);
  ensure(tieResolved.payload.tieBreak.selected_code === "conquerant", "Le vote officiel 2 contre 1 doit departager le profil");
  ensure(tieResolved.payload.scores.every((score) => Number(score.percentage) === 50), "Le departage ne doit jamais modifier les scores naturels");
  const tieReplay = await one(db, "select public.mapp_submit_tie_break($1,$2,$3::jsonb) payload", [context.attemptId, finalized.payload.resultRevisionId, JSON.stringify(tieAnswers)]);
  ensure(tieReplay.payload.tieBreak.selected_code === "conquerant", "Le rejeu du departage doit rester idempotent");
  const reopened = await one(db, "select public.mapp_open_questionnaire() payload");
  ensure(reopened.payload.attemptId === context.attemptId, "Une reouverture ne doit pas creer une seconde tentative");
  ensure(reopened.payload.status === "completed", "Une reouverture doit conduire au resultat deja finalise");
  const identityDashboard = await one(db, "select public.student_identity_dashboard() payload");
  ensure(identityDashboard.payload.metrics.studentCount === 1, "Le compteur doit inclure l'etudiant actif confirme");
  ensure(identityDashboard.payload.metrics.completedTests === 1, "Le test MAPP termine doit etre compte une seule fois");
  ensure(identityDashboard.payload.identityResults.length === 1, "Seul le resultat MAPP termine doit etre affiche");

  await db.exec("reset role");
  const counts = await one(db, `
    select
      (select count(*)::int from mapp.attempt_answers where attempt_id=$1) answers,
      (select count(*)::int from mapp.answer_mutations where attempt_id=$1) mutations,
      (select count(*)::int from mapp.result_revisions where attempt_id=$1) result_revisions,
      (select server_revision from mapp.attempts where id=$1) server_revision
  `, [context.attemptId]);
  ensure(counts.answers === 50, "Les 50 reponses doivent etre conservees");
  ensure(counts.mutations === 10, "Les 50 reponses doivent produire dix mutations, pas cinquante");
  ensure(counts.result_revisions === 1, "Une seule revision de resultat doit exister");

  const unconfirmedId = randomUUID();
  await db.query("insert into auth.users(id,email) values($1,'student-unconfirmed@example.invalid')", [unconfirmedId]);
  await db.query(`
    insert into public.profiles(id,full_name,role,email_confirmed,deactivated)
    values($1,'Etudiant Non Confirme','student',false,false)
  `, [unconfirmedId]);
  await useIdentity(db, unconfirmedId, "student-unconfirmed@example.invalid");
  const unconfirmedError = await expectFailure(
    "etudiant non confirme",
    () => db.query("select public.mapp_open_questionnaire()"),
    /MAPP_ACCESS_DENIED/,
  );

  const otherId = randomUUID();
  await db.exec("reset role");
  await db.query("insert into auth.users(id,email) values($1,'student-other@example.invalid')", [otherId]);
  await db.query(`
    insert into public.profiles(id,full_name,role,email_confirmed,deactivated)
    values($1,'Autre Etudiant','student',true,false)
  `, [otherId]);
  await useIdentity(db, otherId, "student-other@example.invalid");
  const crossAccessError = await expectFailure(
    "acces croise",
    () => db.query("select public.mapp_get_results($1)", [context.attemptId]),
    /MAPP_RESULT_UNAVAILABLE/,
  );

  console.log(JSON.stringify({
    engine: "PGlite PostgreSQL compatible",
    remoteAccess: false,
    migrationsApplied: migrations.length,
    questionnaire: { questions: 50, batches: 10, writesPerBatch: 5 },
    persistence: counts,
    idempotentFinalization: true,
    tieBreak: { officialQuestions: 3, selectedCode: "conquerant", naturalScoresPreserved: true, idempotentReplay: true },
    identityDashboard: { consolidatedRpc: true, completedResultsOnly: true, completedTests: 1 },
    eligibility: {
      confirmedActiveStudent: "accepted",
      unconfirmedStudent: unconfirmedError,
      crossStudentResult: crossAccessError,
    },
  }, null, 2));
} finally {
  await db.close();
}
