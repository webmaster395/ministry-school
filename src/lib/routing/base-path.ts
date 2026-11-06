export const MAPP_BASE_PATH = "/apps/profil-mapp";

export function withMappBasePath(path: string) {
  if (path.startsWith("/api/")) return path;
  if (!path.startsWith("/") || path === MAPP_BASE_PATH || path.startsWith(`${MAPP_BASE_PATH}/`)) return path;
  return `${MAPP_BASE_PATH}${path}`;
}

export function withMappAssetPath(path: string) {
  return withMappBasePath(path);
}
