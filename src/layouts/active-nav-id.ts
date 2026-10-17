import type { DashboardNavItem } from "@/pages/Dashboard/Components/dashboardNavConfig";

/**
 * Which nav item a URL belongs to: the first segment after the dashboard root, or an item that
 * claims it through `activeOn`.
 *
 * This used to be the *last* segment, which only worked for top-level pages. On
 * `/dashboard/quiz/37` it looked for an item called "37", so nothing was lit and the page
 * looked detached from the section it belongs to.
 */
export function activeNavId(
  pathname: string,
  basePath: string,
  navItems: DashboardNavItem[]
): string {
  const rest = pathname.startsWith(`${basePath}/`) ? pathname.slice(basePath.length + 1) : "";
  const segment = rest.split("/")[0] ?? "";
  const owner = navItems.find((item) => item.activeOn?.includes(segment));
  return owner?.id ?? segment;
}
