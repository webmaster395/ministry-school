import { createHash } from "node:crypto";
import { cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const candidateRoot = process.cwd();
const referenceRoot = path.resolve(candidateRoot, "../mapp-reference");
const sourceRoots = [
  "app/preview/resultat/preview-shell.tsx",
  "app/preview/resultat/complete-experience.tsx",
  "lib/results/tie-breaker.ts",
];
const extensions = [".ts", ".tsx", ".json", ".css"];
const visited = new Set();
const integrationManaged = new Set([
  "app/preview/resultat/save-profile-menu.tsx",
  "lib/routing/base-path.ts",
]);

function candidatePath(relative) {
  if (relative.startsWith("app/")) return path.join(candidateRoot, "src", relative);
  if (relative.startsWith("components/")) return path.join(candidateRoot, "src", relative);
  if (relative.startsWith("data/")) return path.join(candidateRoot, "src", relative);
  if (relative.startsWith("lib/")) return path.join(candidateRoot, "src", relative);
  throw new Error(`Chemin source non autorise: ${relative}`);
}

async function exists(file) {
  try { return (await stat(file)).isFile(); } catch { return false; }
}

async function resolveImport(fromRelative, specifier) {
  let base;
  if (specifier.startsWith("@/")) base = specifier.slice(2);
  else if (specifier.startsWith(".")) base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRelative), specifier));
  else return null;

  for (const candidate of [base, ...extensions.map((extension) => `${base}${extension}`), ...extensions.map((extension) => `${base}/index${extension}`)]) {
    if (await exists(path.join(referenceRoot, candidate))) return candidate;
  }
  return null;
}

async function collect(relative) {
  if (visited.has(relative)) return;
  visited.add(relative);
  const source = await readFile(path.join(referenceRoot, relative), "utf8");
  const imports = [...source.matchAll(/(?:from\s+|import\s*\()(["'])([^"']+)\1/g)].map((match) => match[2]);
  for (const specifier of imports) {
    const resolved = await resolveImport(relative, specifier);
    if (resolved) await collect(resolved);
  }
}

for (const root of sourceRoots) await collect(root);

const manifest = [];
for (const relative of [...visited].sort()) {
  const sourcePath = path.join(referenceRoot, relative);
  const targetPath = candidatePath(relative);
  const source = await readFile(sourcePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  if (!integrationManaged.has(relative) || !(await exists(targetPath))) await writeFile(targetPath, source);
  const digest = createHash("sha256").update(source).digest("hex");
  manifest.push({ source: relative, target: path.relative(candidateRoot, targetPath), sha256: digest, nativeAdaptation: integrationManaged.has(relative) });
}

await cp(path.join(referenceRoot, "public/images"), path.join(candidateRoot, "public/apps/profil-mapp/images"), { recursive: true, force: true });
await cp(path.join(referenceRoot, "public/pdf-templates"), path.join(candidateRoot, "public/apps/profil-mapp/pdf-templates"), { recursive: true, force: true });
await cp(path.join(referenceRoot, "public/results-design-system.css"), path.join(candidateRoot, "public/apps/profil-mapp/results-design-system.css"), { force: true });
await cp(path.join(referenceRoot, "public/results-design-system.css"), path.join(candidateRoot, "src/app/mapp-results-design-system.css"), { force: true });

await writeFile(
  path.join(candidateRoot, "src/data/mapp-editorial-port-manifest.json"),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), source: "mapp-reference", files: manifest }, null, 2)}\n`,
);
console.log(`Port editorial termine: ${manifest.length} fichiers sources et leurs actifs.`);
