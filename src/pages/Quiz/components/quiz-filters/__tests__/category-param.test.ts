import { describe, expect, test } from "vitest";
import { CATEGORY_PARAM, categoryListPath, findCategoryByName } from "../category-param";

const categories = [
  { id: 3, name: "Geography" },
  { id: 7, name: "Film & TV" },
  { id: 9, name: "Space & Astronomy" },
];

describe("findCategoryByName", () => {
  test("matches an exact name", () => {
    expect(findCategoryByName(categories, "Film & TV")?.id).toBe(7);
  });

  test("ignores case, surrounding whitespace and repeated spaces", () => {
    expect(findCategoryByName(categories, "  space   &  astronomy ")?.id).toBe(9);
    expect(findCategoryByName(categories, "GEOGRAPHY")?.id).toBe(3);
  });

  test("does not fuzzy-match a different spelling", () => {
    expect(findCategoryByName(categories, "Film and TV")).toBeUndefined();
    expect(findCategoryByName(categories, "Geo")).toBeUndefined();
  });

  test("an unknown or blank name matches nothing", () => {
    expect(findCategoryByName(categories, "Politics")).toBeUndefined();
    expect(findCategoryByName(categories, "   ")).toBeUndefined();
    expect(findCategoryByName([], "Geography")).toBeUndefined();
  });
});

describe("categoryListPath", () => {
  test("encodes the name so & and spaces survive the round trip", () => {
    const path = categoryListPath("Food & Drink");
    expect(path).toBe("/choose-quiz/all?category=Food%20%26%20Drink");
    const params = new URL(path, "https://x.test").searchParams;
    expect(params.get(CATEGORY_PARAM)).toBe("Food & Drink");
  });
});
