/**
 * `/choose-quiz/all?category=<name>` — open the quiz list already filtered to one category.
 * (`/choose-quiz?category=` still works: since the featured page took `/choose-quiz` on
 * 2026-10-07, its loader passes any such link on to the list.)
 *
 * By **name**, not id: ids are database-generated and differ between dev and live, while the
 * names are the shared vocabulary. Nothing links with it today (the landing page that did was
 * redesigned, 2026-09-21); any link that wants a category-filtered list can use it.
 *
 * What the list does with it (Quiz-Selection.tsx):
 * - name matches a category → the list opens with that category selected;
 * - name matches nothing, or the category has no public quizzes → the list shows every quiz
 *   with a one-line note, so a visitor never lands on an empty page.
 */
export const CATEGORY_PARAM = "category";

const normalize = (s: string) => s.trim().replace(/\s+/g, " ").toLocaleLowerCase();

/** Case-, space- and surrounding-whitespace-insensitive; exact otherwise ("Film and TV" ≠ "Film & TV"). */
export function findCategoryByName<T extends { name: string }>(
  categories: readonly T[],
  name: string,
): T | undefined {
  const wanted = normalize(name);
  if (!wanted) return undefined;
  return categories.find((c) => normalize(c.name) === wanted);
}

/** The link, built in one place so callers can't disagree on encoding. */
export const categoryListPath = (name: string) =>
  `/choose-quiz/all?${CATEGORY_PARAM}=${encodeURIComponent(name)}`;
