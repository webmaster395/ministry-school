import "server-only";
import { updateTag } from "next/cache";

export const STUDENT_PROGRAM_CACHE_TAG = "student-program";

/**
 * Expire immédiatement le programme partagé après une mutation admin/formateur.
 * À appeler uniquement depuis une Server Action, conformément au contrat de updateTag.
 */
export function invalidateStudentProgram() {
  updateTag(STUDENT_PROGRAM_CACHE_TAG);
}
