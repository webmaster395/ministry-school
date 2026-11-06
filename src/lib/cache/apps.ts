import "server-only";
import { updateTag } from "next/cache";

export const STUDENT_TOOLS_SETTINGS_CACHE_TAG = "student-tools-settings";

/**
 * Expire immédiatement le réglage global après une mutation du studio d'apps.
 * À appeler uniquement depuis une Server Action.
 */
export function invalidateStudentToolsSettings() {
  updateTag(STUDENT_TOOLS_SETTINGS_CACHE_TAG);
}
