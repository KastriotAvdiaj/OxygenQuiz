/**
 * A quiz listing's URL (`/q/:id/:slug`), for the app. The one implementation lives beside the
 * Worker, which redirects, writes the canonical link and builds the sitemap with it — re-exported
 * here so the app's Copy link and listing route can never build a different URL.
 * docs/quiz/quiz-listing.md, "The URL".
 */
export { LISTING_PATH, SITE_ORIGIN, listingPath, listingUrl, slugify } from "../../worker/listing-url.js";
