import { panelPath } from "../panel-shape";

// The panel's outline (docs/quiz/featured-quizzes.md, "The panel shape").
describe("panelPath", () => {
  const shape = { width: 1000, height: 300, tabWidth: 300, tabHeight: 52, radius: 18 };

  test("starts at the body's top-left, below the tab line, and closes", () => {
    const d = panelPath(shape);
    expect(d.startsWith("M0 70")).toBe(true); // tabHeight + radius
    expect(d.endsWith("Z")).toBe(true);
  });

  test("puts the tab's top edge at y=0 between its rounded corners", () => {
    // The tab starts at x = 1000 - 300 = 700; its top runs from 718 to 982.
    expect(panelPath(shape)).toContain("Q700 0 718 0 L982 0");
  });

  test("never makes the tab wider than the card", () => {
    const d = panelPath({ ...shape, width: 200, tabWidth: 300 });
    expect(d).not.toMatch(/-\d/); // no negative coordinates
  });

  test("shrinks the corner radius to fit a short tab", () => {
    // radius 18 on a 20px tab would overlap; it is capped at half the tab height.
    expect(panelPath({ ...shape, tabHeight: 20 })).toContain("M0 30"); // 20 + 10
  });

  test("is stable under sub-pixel noise", () => {
    expect(panelPath({ ...shape, width: 1000.0001 })).toBe(panelPath(shape));
  });
});
