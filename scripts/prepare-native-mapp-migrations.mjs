import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "..", "mapp-reference", "supabase", "migrations");
const destination = resolve(root, "supabase", "migrations");
const excluded = new Set(["202611030001_ministry_federation.sql"]);

function nativeSchema(sql, filename) {
  let transformed = sql
    .replaceAll("public.", "mapp.")
    .replaceAll("private.", "mapp_private.")
    .replaceAll("schema if not exists private", "schema if not exists mapp_private")
    .replaceAll("schema private", "schema mapp_private")
    .replaceAll("schema public", "schema mapp")
    .replaceAll("search_path = public", "search_path = mapp");

  if (filename === "202610070001_foundation.sql") {
    transformed = [
      "-- Native Ministry integration: all MAPP objects live outside public.",
      "create schema if not exists mapp;",
      "revoke all on schema mapp from public, anon;",
      "grant usage on schema mapp to authenticated, service_role;",
      "",
      transformed,
    ].join("\n");
  }

  return [
    `-- Generated from Profil MAPP ${filename}.`,
    "-- Do not edit this generated file; update the source migration or transformer.",
    transformed,
  ].join("\n");
}

const files = (await readdir(source))
  .filter((filename) => filename.endsWith(".sql") && !excluded.has(filename))
  .sort();

await mkdir(destination, { recursive: true });

for (const [index, filename] of files.entries()) {
  const minute = String(index).padStart(2, "0");
  const output = `2026110610${minute}00_mapp_port_${basename(filename, ".sql").replace(/^\d+_/, "")}.sql`;
  const sql = await readFile(resolve(source, filename), "utf8");
  await writeFile(resolve(destination, output), nativeSchema(sql, filename));
}

console.log(`Prepared ${files.length} native MAPP migrations in ${destination}`);
