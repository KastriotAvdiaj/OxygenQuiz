/**
 * REMOVED — safe to delete this file.
 *
 * The standalone settings page is gone; settings are sections of the account overlay
 * (see docs/development/account-overlay.md). `/my-dashboard/settings` now redirects there.
 *
 * Its parts live on:
 * - form state, dirty tracking, save/discard → `./useSettingsForm.ts`
 * - the section UIs → `./components/*` (unchanged, rendered by the overlay panels)
 *
 * Left as a stub only because the tooling that made this change could not delete files
 * in the working tree. Nothing imports it.
 */
export {};
