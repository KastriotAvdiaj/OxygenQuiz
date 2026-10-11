/**
 * Who runs the site — the one place the legal pages and the footer read it from
 * (docs/proposals/legal-and-compliance-for-launch.md §2.1).
 *
 * The site is run by an individual, not a registered company: there is no business name and no
 * business number (NUI) to show. If a company is registered later, this is where it goes, and
 * the Terms and the Privacy Policy change with it (bump the version below).
 *
 * One mailbox serves both contact and privacy requests; the two keys stay separate so a
 * dedicated privacy address can be added without touching the pages.
 */
export const LEGAL_ENTITY = {
  productName: "OxygenQuiz",
  siteUrl: "https://oxygenquiz.com",
  operatorName: "Kastriot Avdiaj",
  location: "Istog, Kosovo",
  contactEmail: "support@oxygenquiz.com",
  privacyEmail: "support@oxygenquiz.com",
} as const;

/** Bump the version when the Terms or the Privacy Policy change materially. */
export const LEGAL_DOCUMENTS = {
  version: "1.0",
  lastUpdated: "10 October 2026",
} as const;
