import { useUser } from "@/lib/Auth";
import { ROLES } from "@/lib/authorization";
import type { QuizFormat } from "@/types/quiz-types";

/**
 * Formats in preview — admins and Teachers only (docs/auth/teacher-role.md §2.3). Mirrors `QuizFormatAccess.PreviewFormats` on the server,
 * which is the rule: for a non-admin the API leaves these quizzes out of every read and answers
 * 404 from their authoring endpoints. This copy only decides what to *offer* (the create card,
 * the create route), so a player isn't shown a door that leads to a 404.
 *
 * Releasing a format: remove it here and in `QuizFormatAccess` together.
 * Empty since 2026-10-08, when Associations was released (docs/quiz/associations.md §0).
 */
export const PREVIEW_FORMATS: readonly QuizFormat[] = [];

/** True when the signed-in user may use `format`. Always true for a released format. */
export const useFormatAvailable = (format: QuizFormat): boolean => {
  const user = useUser();
  if (!PREVIEW_FORMATS.includes(format)) return true;
  const roles = user.data?.roles ?? [];
  return (
    roles.includes(ROLES.Admin) ||
    roles.includes(ROLES.SuperAdmin) ||
    roles.includes(ROLES.Teacher)
  );
};
