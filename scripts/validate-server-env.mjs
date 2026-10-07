const productionBuild =
  process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production";

if (!productionBuild) process.exit(0);

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];
const missing = required.filter((name) => !process.env[name]?.trim());

if (missing.length) {
  console.error(
    `Configuration Production incomplète. Variables absentes : ${missing.join(", ")}`,
  );
  process.exit(1);
}

console.log("Configuration serveur Production vérifiée.");
