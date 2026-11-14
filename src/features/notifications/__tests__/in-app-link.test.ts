import { describe, expect, it } from "vitest";

import { inAppLink } from "../api/notifications";

/**
 * A notification's link ends up in `navigate()`, so only a path inside the app may pass. The
 * API applies the same rule before storing one (NotificationService.SafeLink,
 * `AiGenerationJobTests.A_link_is_a_path_inside_the_app_or_nothing`); this is the client's own
 * check, not a reliance on that one.
 */
describe("inAppLink", () => {
  it.each(["/dashboard/quizzes/create-quiz/ai", "/my-dashboard", "/q/12/general-knowledge?x=1"])(
    "keeps the in-app path %s",
    (link) => expect(inAppLink(link)).toBe(link),
  );

  it.each([
    null,
    undefined,
    "",
    "dashboard/quizzes",
    "https://example.com/",
    "//example.com/",
    "javascript:alert(1)",
    "/redirect?to=https://example.com",
    "/\\example.com",
  ])("drops %s", (link) => expect(inAppLink(link)).toBeNull());
});
