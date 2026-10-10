/**
 * Who runs the site — the one place the legal pages and the footer read it from
 * (docs/proposals/legal-and-compliance-for-launch.md §2.1).
 *
 * The TODO values are not known to the code and must be filled in before these pages go live:
 * Paddle's review and the privacy law both require a real seller name, address and contact.
 */
export const LEGAL_ENTITY = {
  productName: "OxygenQuiz",
  siteUrl: "https://oxygenquiz.com",
  businessName: "TODO: registered business name",
  registeredAddress: "TODO: registered address, Kosovo",
  businessNumber: "TODO: business number (NUI)",
  contactEmail: "TODO: contact email",
  privacyEmail: "TODO: privacy email",
} as const;

/** Bump the version when the Terms or the Privacy Policy change materially. */
export const LEGAL_DOCUMENTS = {
  version: "1.0",
  lastUpdated: "10 October 2026",
} as const;
