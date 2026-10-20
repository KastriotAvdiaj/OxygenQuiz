import { describe, expect, it } from "vitest";

import { SHARED_PATH, escapeAttribute, previewFor } from "../preview.js";

const API = "https://api.oxygenquiz.com";
const LINK = "https://oxygenquiz.com/play/shared/0123456789abcdef0123456789abcdef";

describe("previewFor", () => {
  it("uses the quiz's own title and description", () => {
    const p = previewFor({ title: "Past Masters", description: "Historical events and eras." }, LINK, API);
    expect(p.title).toBe("Past Masters · Oxygen Quiz");
    expect(p.ogTitle).toBe("Past Masters");
    expect(p.description).toBe("Historical events and eras.");
    expect(p.url).toBe(LINK);
  });

  it("builds a description from the facts when the author wrote none", () => {
    expect(previewFor({ title: "T", questionCount: 6, category: "History" }, LINK, API).description).toBe(
      "6 questions · History. Play it on Oxygen Quiz.",
    );
    expect(previewFor({ title: "T", questionCount: 1 }, LINK, API).description).toBe(
      "1 question. Play it on Oxygen Quiz.",
    );
    expect(previewFor({ title: "T", format: "Associations" }, LINK, API).description).toBe(
      "An Associations board. Play it on Oxygen Quiz.",
    );
  });

  it("makes an uploaded image's path absolute, and has no image without one", () => {
    expect(previewFor({ title: "T", imageUrl: "/uploads/q.png" }, LINK, API).image).toBe(
      "https://api.oxygenquiz.com/uploads/q.png",
    );
    expect(previewFor({ title: "T" }, LINK, API).image).toBeNull();
  });

  it("keeps a long description to preview length", () => {
    const p = previewFor({ title: "T", description: "x".repeat(500) }, LINK, API);
    expect(p.description.length).toBe(200);
    expect(p.description.endsWith("…")).toBe(true);
  });
});

describe("SHARED_PATH", () => {
  it("matches a share link and nothing else", () => {
    expect("/play/shared/0123456789abcdef0123456789abcdef".match(SHARED_PATH)?.[1]).toBe(
      "0123456789abcdef0123456789abcdef",
    );
    expect(SHARED_PATH.test("/play/shared/")).toBe(false);
    expect(SHARED_PATH.test("/play/shared/abc/extra")).toBe(false);
    expect(SHARED_PATH.test("/play/shared/<script>")).toBe(false);
  });
});

describe("escapeAttribute", () => {
  it("can't be broken out of", () => {
    expect(escapeAttribute('"><script>')).toBe("&quot;&gt;&lt;script&gt;");
  });
});
