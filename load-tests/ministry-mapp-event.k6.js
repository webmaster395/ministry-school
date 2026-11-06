import http from "k6/http";
import { check, fail, sleep } from "k6";
import { SharedArray } from "k6/data";

const target = (__ENV.VALIDATION_BASE_URL || "").replace(/\/$/, "");
const supabaseUrl = (__ENV.VALIDATION_SUPABASE_URL || "").replace(/\/$/, "");
const anonKey = __ENV.VALIDATION_SUPABASE_ANON_KEY || "";
const allowedHosts = (__ENV.LOAD_TEST_ALLOWED_HOSTS || "").split(",").map((value) => value.trim()).filter(Boolean);

if (__ENV.LOAD_TEST_AUTHORIZED !== "YES") fail("LOAD_TEST_AUTHORIZED=YES est obligatoire.");
for (const value of [target, supabaseUrl]) {
  const host = new URL(value).host;
  if (!allowedHosts.includes(host) || /ministryschool\.fr$|supabase\.co$/.test(host) && !/validation|staging|localhost|127\.0\.0\.1/.test(host)) {
    fail(`Cible non autorisée: ${host}`);
  }
}

const accounts = new SharedArray("synthetic-accounts", () => JSON.parse(open(__ENV.LOAD_TEST_ACCOUNTS_JSON)));
export const options = {
  scenarios: {
    signups: { executor: "per-vu-iterations", vus: 30, iterations: 1, startTime: "0s", maxDuration: "2m", exec: "signup" },
    logins: { executor: "per-vu-iterations", vus: 290, iterations: 1, startTime: "2m", maxDuration: "4m", exec: "loginAndDashboard" },
    mapp: { executor: "per-vu-iterations", vus: 300, iterations: 1, startTime: "7m", maxDuration: "20m", exec: "completeMapp" },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2000", "p(99)<5000"],
    checks: ["rate>0.99"],
  },
};

function account() { return accounts[(__VU - 1) % accounts.length]; }
function authHeaders(token) { return { apikey: anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }; }
function authenticate(credentials = account()) {
  const response = http.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, JSON.stringify(credentials), { headers: { apikey: anonKey, "Content-Type": "application/json" }, tags: { operation: "ministry_login" } });
  check(response, { "auth 200": (result) => result.status === 200 });
  return response.json("access_token");
}
function rpc(name, payload, token, operation) {
  const response = http.post(`${supabaseUrl}/rest/v1/rpc/${name}`, JSON.stringify(payload || {}), { headers: authHeaders(token), tags: { operation } });
  check(response, { [`${operation} 2xx`]: (result) => result.status >= 200 && result.status < 300 });
  return response;
}

export function signup() {
  const credentials = account();
  const response = http.post(`${supabaseUrl}/auth/v1/signup`, JSON.stringify(credentials), { headers: { apikey: anonKey, "Content-Type": "application/json" }, tags: { operation: "ministry_signup" } });
  check(response, { "signup accepté": (result) => [200, 201, 422].includes(result.status) });
}

export function loginAndDashboard() {
  const token = authenticate();
  const page = http.get(`${target}/apps`, { headers: { Authorization: `Bearer ${token}` }, tags: { operation: "ministry_tools" } });
  check(page, { "Mes outils répond": (result) => result.status < 500 });
}

export function completeMapp() {
  const token = authenticate();
  const opened = rpc("mapp_open_questionnaire", {}, token, "mapp_open").json();
  const questions = opened.questions || [];
  let revision = opened.serverRevision;
  for (let offset = 0; offset < questions.length; offset += 5) {
    sleep(1 + Math.random() * 2);
    const answers = questions.slice(offset, offset + 5).map((question, index) => ({ questionId: question.id, value: 1 + ((offset + index) % 5) }));
    const saved = rpc("mapp_save_answer_batch", {
      p_attempt_id: opened.attemptId,
      p_mutation_id: `${__VU.toString(16).padStart(8, "0")}-0000-4000-8000-${(offset + 1).toString(16).padStart(12, "0")}`,
      p_expected_revision: revision,
      p_client_sequence: offset / 5 + 1,
      p_answers: answers,
    }, token, "mapp_save_batch").json();
    revision = saved.serverRevision;
  }
  rpc("mapp_finalize_attempt", { p_attempt_id: opened.attemptId }, token, "mapp_finalize");
  rpc("mapp_get_results", { p_attempt_id: opened.attemptId }, token, "mapp_results");
}
