/**
 * The face of a dashboard page-header action ("+ Create Quiz", "Filters"): 14px on phones,
 * the full 16px from `sm` up. `py-2` around a 14px line is still 36px, the touch floor in
 * docs/RESPONSIVE.md, so smaller costs nothing in tappability. Both buttons in a header row
 * take this, so they stay exactly as tall as each other at every width.
 */
export const HEADER_ACTION_FACE = "px-3 text-sm sm:px-4 sm:text-base";
