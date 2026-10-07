import { catalogueRedirectFor } from "../featured-quizzes.loader";

// /choose-quiz became the featured page on 2026-10-07; links written for the catalogue that
// used to live there must still land in it (docs/quiz/featured-quizzes.md, "Routes").
describe("catalogueRedirectFor", () => {
  const at = (path: string) => catalogueRedirectFor(new URL(path, "https://oxygenquiz.com"));

  test("shows the featured page for a plain /choose-quiz", () => {
    expect(at("/choose-quiz")).toBeNull();
  });

  test("passes a ?category= link on to the catalogue, query intact", () => {
    expect(at("/choose-quiz?category=Food%20%26%20Drink")).toBe("/choose-quiz/all?category=Food%20%26%20Drink");
  });

  test("passes an old ?shared= link on too", () => {
    expect(at("/choose-quiz?shared=abc")).toBe("/choose-quiz/all?shared=abc");
  });

  test("keeps unrelated parameters, like the settings overlay, on the featured page", () => {
    expect(at("/choose-quiz?settings=appearance")).toBeNull();
  });
});
