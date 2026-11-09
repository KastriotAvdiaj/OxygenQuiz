import { listingPath } from "../worker/listing-url.js";
import { expect, test } from "./support/fixtures";
import { SAMPLE_QUESTIONS } from "./support/sample-quiz";
import { API_URL } from "./support/stack";

/**
 * The quiz listing (docs/quiz/quiz-listing.md): the public page a Public quiz's link opens. The
 * E2E stack has no Worker — Vite serves the SPA — so this is the app's half of the page: its route,
 * the listing endpoint, the canonical redirect and Play. The Worker's half (head tags, the body
 * crawlers read, the 404 and the 301) is unit-tested in worker/__tests__/listing.test.js.
 */

test("a Public quiz's link opens its listing, and Play starts it for a signed-out visitor", async ({
  page,
  sampleQuiz,
  quizPlay,
}) => {
  const canonical = listingPath(sampleQuiz.id, sampleQuiz.title);

  // An old or mistyped slug still finds the quiz by its id, and lands on the current URL.
  await page.goto(`/q/${sampleQuiz.id}/an-old-title`);
  await expect(page).toHaveURL(canonical);
  // The page names its clean address as canonical (CanonicalLink) — without it Google files every
  // SPA route as an unlabelled duplicate.
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    new URL(canonical, page.url()).href,
  );
  // The API answers for the listing, but keeps itself out of search: Search Console counts
  // api.oxygenquiz.com as part of the site.
  const api = await page.request.get(`${API_URL}/quiz/${sampleQuiz.id}/listing`);
  expect(api.headers()["x-robots-tag"]).toBe("noindex");

  await expect(page.getByRole("heading", { level: 1, name: sampleQuiz.title })).toBeVisible();
  await expect(page.getByText("Created by the end-to-end suite.")).toBeVisible();
  await expect(page.getByText("Questions", { exact: true })).toBeVisible();
  await expect(page.getByText(String(SAMPLE_QUESTIONS.length), { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Play" }).click();

  await expect(page).toHaveURL(`/quiz/${sampleQuiz.id}/play`);
  await expect(quizPlay.question(SAMPLE_QUESTIONS[0].text)).toBeVisible();
});
