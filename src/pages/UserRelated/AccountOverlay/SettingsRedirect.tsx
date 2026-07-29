import { Navigate, useParams } from "react-router-dom";
import { SETTINGS_PARAM } from "./use-account-overlay";
import { MENU_SECTION, isOverlaySection } from "./overlay-sections";

/**
 * Keeps pretty/legacy URLs working now that account + settings live in an overlay
 * instead of on their own pages.
 *
 * `/settings`, `/settings/appearance`, and the retired `/my-dashboard/profile` and
 * `/my-dashboard/settings` all land here and bounce to the overlay's query form on
 * whichever page is configured as the landing surface. `replace` keeps the dead URL out
 * of history, so Back doesn't bounce the user through the redirect again.
 */
export const SettingsRedirect = ({
  section,
  to = "/",
}: {
  /** Fixed section, for routes that map to exactly one (e.g. the old profile page). */
  section?: string;
  /** Page the overlay should open over. */
  to?: string;
}) => {
  const params = useParams();
  const requested = section ?? params.section ?? MENU_SECTION;
  const resolved = isOverlaySection(requested) ? requested : MENU_SECTION;

  return <Navigate to={`${to}?${SETTINGS_PARAM}=${resolved}`} replace />;
};
