import http from "k6/http";
import { check, fail, sleep } from "k6";
import encoding from "k6/encoding";
import { SharedArray } from "k6/data";

const APP_URL = (__ENV.APP_URL || "https://www.ministryschool.fr").replace(/\/$/, "");
const SUPABASE_URL = (__ENV.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || "";
const TARGET_VUS = Number(__ENV.TARGET_VUS || 50);
const SHARD_INDEX = Number(__ENV.SHARD_INDEX || 0);
const SHARD_COUNT = Number(__ENV.SHARD_COUNT || 1);
const ACCOUNTS_FILE = __ENV.ACCOUNTS_FILE || "./accounts.csv";
const SESSION_ID = __ENV.SESSION_ID || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("SUPABASE_URL et SUPABASE_ANON_KEY sont obligatoires.");
if (!Number.isInteger(SHARD_INDEX) || !Number.isInteger(SHARD_COUNT) || SHARD_COUNT < 1 || SHARD_INDEX < 0 || SHARD_INDEX >= SHARD_COUNT) {
  throw new Error("SHARD_INDEX doit être compris entre 0 et SHARD_COUNT - 1.");
}

const allAccounts = new SharedArray("load-test-accounts", () => {
  const lines = open(ACCOUNTS_FILE).split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
  if (lines[0]?.toLowerCase() === "email,password") lines.shift();
  return lines.map((line, index) => {
    const comma = line.indexOf(",");
    if (comma < 1) throw new Error(`Compte invalide à la ligne ${index + 1}`);
    return { email: line.slice(0, comma).trim(), password: line.slice(comma + 1).trim() };
  });
});

const accounts = allAccounts.filter((_, index) => index % SHARD_COUNT === SHARD_INDEX);
if (accounts.length < TARGET_VUS) throw new Error(`Runner ${SHARD_INDEX}: ${TARGET_VUS} comptes requis, ${accounts.length} disponibles.`);
if (new Set(allAccounts.map((account) => account.email.toLowerCase())).size !== allAccounts.length) throw new Error("Chaque VU doit utiliser un compte distinct.");

export const options = {
  scenarios: { student_journey: { executor: "per-vu-iterations", vus: TARGET_VUS, iterations: 1, maxDuration: "3m" } },
  thresholds: {
    checks: ["rate>0.99"],
    http_req_failed: ["rate<0.01"],
    "http_req_duration{step:auth}": ["p(95)<2000", "p(99)<4000"],
    "http_req_duration{step:home}": ["p(95)<2000", "p(99)<4000"],
    "http_req_duration{step:courses}": ["p(95)<2000", "p(99)<4000"],
    "http_req_duration{step:course}": ["p(95)<2500", "p(99)<5000"],
  },
  noConnectionReuse: false,
  userAgent: "MinistrySchool-Authorized-Load-Test/1.0",
};

function setSupabaseSessionCookie(session) {
  const projectRef = SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0];
  const name = `sb-${projectRef}-auth-token`;
  const value = `base64-${encoding.b64encode(JSON.stringify(session), "rawurl")}`;
  const jar = http.cookieJar();
  const options = { path: "/", secure: APP_URL.startsWith("https://"), same_site: "Lax" };
  if (value.length <= 3180) return jar.set(APP_URL, name, value, options);
  for (let index = 0, offset = 0; offset < value.length; index += 1, offset += 3180) {
    jar.set(APP_URL, `${name}.${index}`, value.slice(offset, offset + 3180), options);
  }
}

function signIn(account) {
  const response = http.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, JSON.stringify(account), {
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    tags: { step: "auth" }, redirects: 0,
  });
  const ok = check(response, { "auth: 200": (r) => r.status === 200, "auth: aucun 429": (r) => r.status !== 429 });
  if (!ok) fail(`Connexion refusée pour le VU ${__VU}: HTTP ${response.status}`);
  const session = response.json();
  setSupabaseSessionCookie(session);
  const claim = http.post(`${SUPABASE_URL}/rest/v1/rpc/claim_delegations`, "{}", {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
    tags: { step: "claim_delegations" },
  });
  check(claim, { "délégations: succès": (r) => r.status >= 200 && r.status < 300 });
}

function getPage(path, step) {
  const response = http.get(`${APP_URL}${path}`, { redirects: 0, tags: { step } });
  check(response, {
    [`${step}: 200`]: (r) => r.status === 200,
    [`${step}: aucune redirection login`]: (r) => !String(r.headers.Location || "").includes("/login"),
  });
  return response;
}

export default function studentJourney() {
  const account = accounts[__VU - 1];
  getPage("/login", "login_page");
  signIn(account);
  const home = getPage("/etudiant", "home");
  sleep(Math.random() * 0.4 + 0.1);
  getPage("/etudiant/cours", "courses");
  sleep(Math.random() * 0.4 + 0.1);
  const detectedSession = String(home.body).match(/href=["']\/etudiant\/seances\/([0-9a-f-]{36})/i)?.[1];
  const sessionId = SESSION_ID || detectedSession;
  check(home, { "un cours est disponible": () => !!sessionId });
  if (sessionId) getPage(`/etudiant/seances/${sessionId}`, "course");
}
