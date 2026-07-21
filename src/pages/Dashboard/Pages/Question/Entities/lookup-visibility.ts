import { useUser } from "@/lib/Auth";
import { ROLES } from "@/lib/authorization";

/**
 * Visibility rules for the shared question lookups (category / difficulty / language).
 *
 * The backend seeds an "Unspecified" row for each lookup (see
 * OxygenBackend/QuizAPI/Services/DbSeeder.cs). It exists as an internal default the app can
 * assign automatically — e.g. a question's difficulty before anyone rates it — but it is not
 * a meaningful choice for end users. Admins who curate the catalog still need to see and pick
 * it; everyone else should not be offered it in a dropdown.
 */

/** Display name of the seeded system default, matched case-insensitively. */
export const UNSPECIFIED_LOOKUP_LABEL = "Unspecified";

/**
 * True when `label` is the seeded "Unspecified" lookup. Matched by name (not a hard-coded id)
 * so it stays correct regardless of row ordering across environments.
 */
export const isUnspecifiedLookup = (label: string | null | undefined): boolean =>
  label?.trim().toLowerCase() === UNSPECIFIED_LOOKUP_LABEL.toLowerCase();

/**
 * Whether the current user may pick the "Unspecified" lookup. Only catalog admins can;
 * normal users get a list with it filtered out. Non-admins (and unauthenticated states)
 * return false.
 */
export const useCanSelectUnspecifiedLookup = (): boolean => {
  const user = useUser();
  const roles = user.data?.roles ?? [];
  return roles.includes(ROLES.Admin) || roles.includes(ROLES.SuperAdmin);
};
