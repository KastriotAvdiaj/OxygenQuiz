import { useUser } from "@/lib/Auth";
import { ROLES } from "@/lib/authorization";

/**
 * Who may use AI quiz generation — in-app, from material, and the copy-paste prompt. Mirrors
 * `RoleRules.AiRoles` on the server, which is the rule: every AI endpoint refuses anyone else
 * (docs/quiz/ai-quiz-generation-flow.md §4a). This copy only decides what to *offer*, so a player
 * isn't shown a card or a route that ends in a 403. Routes are wrapped in `RequireAi`
 * (require-ai.tsx). Since the public launch (2026-11-07).
 *
 * Fact quizzes are not AI and stay open to everyone (docs/quiz/fact-quizzes.md).
 */
export const AI_ROLES: readonly ROLES[] = [ROLES.Admin, ROLES.SuperAdmin, ROLES.Teacher];

/** True when the signed-in user may use AI generation. */
export const useAiAvailable = (): boolean => {
  const user = useUser();
  const roles = user.data?.roles ?? [];
  return roles.some((r) => (AI_ROLES as readonly string[]).includes(r));
};
