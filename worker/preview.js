// @ts-check
/**
 * What a shared link's preview card says — pure, so it can be unit-tested without a Worker runtime.
 * worker/index.js fetches the card from the API and writes these values into index.html's tags.
 * docs/deployment/frontend-worker.md
 */

const SITE = "Oxygen Quiz";

/** A share token in a URL path: `/play/shared/<token>`. Tokens are 32 hex chars (QuizService). */
export const SHARED_PATH = /^\/play\/shared\/([A-Za-z0-9_-]{8,128})\/?$/;

/**
 * @typedef {{ title: string, description?: string | null, imageUrl?: string | null,
 *   category?: string, format?: string, questionCount?: number }} Card
 */

/**
 * The tag values for one shared quiz.
 * @param {Card} card  the API's SharedQuizPreviewDTO (camelCase JSON)
 * @param {string} pageUrl  the shared link itself
 * @param {string} apiOrigin  where relative image paths (`/uploads/...`) live
 */
export function previewFor(card, pageUrl, apiOrigin) {
  const title = card.title.trim() || SITE;
  return {
    title: `${title} · ${SITE}`,
    ogTitle: title,
    description: describe(card),
    image: card.imageUrl ? absolute(card.imageUrl, apiOrigin) : null,
    url: pageUrl,
  };
}

/**
 * The author's description when there is one; otherwise the facts, phrased without an article so
 * no category needs "a" vs "an" ("6 questions · History. Play it on Oxygen Quiz.").
 */
function describe(card) {
  const own = card.description?.trim();
  if (own) return truncate(own, 200);

  if (card.format === "Associations") return `An Associations board. Play it on ${SITE}.`;
  const count = card.questionCount ?? 0;
  const facts = [
    count > 0 ? (count === 1 ? "1 question" : `${count} questions`) : null,
    card.category || null,
  ].filter(Boolean);
  return facts.length ? `${facts.join(" · ")}. Play it on ${SITE}.` : `Play it on ${SITE}.`;
}

function truncate(text, max) {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

function absolute(path, origin) {
  try {
    return new URL(path, origin).toString();
  } catch {
    return null;
  }
}

/** For HTML we write ourselves (a new `<meta>`), not for setAttribute, which escapes already. */
export function escapeAttribute(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
