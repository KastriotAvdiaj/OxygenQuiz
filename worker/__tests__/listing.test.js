import { describe, expect, it } from "vitest";

import { LISTING_PATH, listingPath, slugify } from "../listing-url.js";
import { describeListing, isIndexable, listingBody, playPath, resolveListing, sitemapXml } from "../listing.js";

const API = "https://api.oxygenquiz.com";

/** The API's QuizListingDTO, camelCase, as the Worker receives it. */
const LISTING = {
  id: 32,
  title: "Kërrë gjeneral për makina",
  description: "Pjesët e makinës.",
  category: "Cars",
  colorPaletteJson: '["#123456"]',
  gradient: false,
  difficulty: "Hard",
  language: "Albanian",
  questionCount: 12,
  timeLimitInSeconds: 490,
  author: "kastriot",
  imageUrl: "/uploads/q.png",
  format: "Classic",
  createdAt: "2026-09-01T12:00:00Z",
  updatedAt: "2026-10-02T08:30:00Z",
};

describe("slugify", () => {
  it("strips diacritics, lowercases and hyphenates", () => {
    expect(slugify("Kërrë gjeneral për makina")).toBe("kerre-gjeneral-per-makina");
    expect(slugify("Çka di për Kosovën?")).toBe("cka-di-per-kosoven");
    expect(slugify("  Film & TV -- 2024!  ")).toBe("film-tv-2024");
  });

  it("is empty when nothing Latin is left", () => {
    expect(slugify("Москва")).toBe("");
    expect(slugify("?!…")).toBe("");
  });

  it("stays within 60 characters, cut at a word", () => {
    const slug = slugify("The longest quiz title anyone has ever written about European capitals and rivers");
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug).toBe("the-longest-quiz-title-anyone-has-ever-written-about");
    expect(slug.endsWith("-")).toBe(false);
  });

  it("cuts a single 60+ character word rather than returning nothing", () => {
    expect(slugify("a".repeat(80))).toBe("a".repeat(60));
  });
});

describe("listingPath / LISTING_PATH", () => {
  it("builds /q/:id/:slug, or /q/:id when the title leaves no slug", () => {
    expect(listingPath(32, "Kërrë gjeneral për makina")).toBe("/q/32/kerre-gjeneral-per-makina");
    expect(listingPath(7, "Москва")).toBe("/q/7");
  });

  it("matches a listing URL with or without a slug, and nothing else", () => {
    expect("/q/32/kerre".match(LISTING_PATH)?.slice(1, 3)).toEqual(["32", "kerre"]);
    expect("/q/32".match(LISTING_PATH)?.[1]).toBe("32");
    expect("/q/32/".match(LISTING_PATH)?.[1]).toBe("32");
    expect(LISTING_PATH.test("/q/")).toBe(false);
    expect(LISTING_PATH.test("/q/abc/x")).toBe(false);
    expect(LISTING_PATH.test("/q/32/a/b")).toBe(false);
  });
});

describe("resolveListing", () => {
  const found = async () => ({ status: 200, listing: LISTING });

  it("serves the page when the slug is the current one", async () => {
    const r = await resolveListing("/q/32/kerre-gjeneral-per-makina", "", found);
    expect(r).toEqual({ kind: "page", listing: LISTING, canonical: "https://oxygenquiz.com/q/32/kerre-gjeneral-per-makina" });
  });

  it("301s a wrong, old, missing or trailing-slash slug to the current one, keeping the query", async () => {
    for (const path of ["/q/32", "/q/32/", "/q/32/old-title", "/q/32/kerre-gjeneral-per-makina/"]) {
      expect(await resolveListing(path, "?utm_source=x", found)).toEqual({
        kind: "redirect",
        location: "https://oxygenquiz.com/q/32/kerre-gjeneral-per-makina?utm_source=x",
      });
    }
  });

  it("redirects any slug to the bare id when the title leaves none", async () => {
    const cyrillic = async () => ({ status: 200, listing: { ...LISTING, id: 7, title: "Москва" } });
    expect(await resolveListing("/q/7/anything", "", cyrillic)).toEqual({
      kind: "redirect",
      location: "https://oxygenquiz.com/q/7",
    });
    expect((await resolveListing("/q/7", "", cyrillic)).kind).toBe("page");
  });

  it("is a 404 for an ineligible id whatever the slug — never redirected first", async () => {
    const gone = async () => ({ status: 404 });
    expect(await resolveListing("/q/32/kerre-gjeneral-per-makina", "", gone)).toEqual({ kind: "notFound" });
    expect(await resolveListing("/q/32", "", gone)).toEqual({ kind: "notFound" });
  });

  it("fails open on anything else — a timeout, an outage, a 500", async () => {
    expect(await resolveListing("/q/32/x", "", async () => ({ status: 500 }))).toEqual({ kind: "failOpen" });
    expect(await resolveListing("/q/32/x", "", async () => null)).toEqual({ kind: "failOpen" });
  });

  it("doesn't ask the API about a path that isn't a listing", async () => {
    let asked = false;
    const r = await resolveListing("/q/abc", "", async () => ((asked = true), { status: 200, listing: LISTING }));
    expect(r).toEqual({ kind: "notFound" });
    expect(asked).toBe(false);
  });
});

describe("isIndexable", () => {
  it("indexes a picked quiz's page and nothing else", () => {
    expect(isIndexable({ kind: "page", listing: { ...LISTING, isPicked: true } })).toBe(true);
    // A community quiz has a page — links and previews work — but it isn't submitted to search.
    expect(isIndexable({ kind: "page", listing: { ...LISTING, isPicked: false } })).toBe(false);
    expect(isIndexable({ kind: "page", listing: LISTING })).toBe(false); // an API without the flag
    expect(isIndexable({ kind: "notFound" })).toBe(false);
    expect(isIndexable({ kind: "failOpen" })).toBe(false);
  });
});

describe("listingBody", () => {
  it("writes the title, description, facts and a plain Play link", () => {
    const html = listingBody(LISTING);
    expect(html).toContain("<h1>Kërrë gjeneral për makina</h1>");
    expect(html).toContain("Pjesët e makinës.");
    for (const fact of ["Cars", "Hard", "Albanian", "12 questions", "8m 10s", "kastriot", "Classic"]) {
      expect(html).toContain(fact);
    }
    expect(html).toContain('<a href="/quiz/32/play">Play</a>');
  });

  it("never carries what the page must not show", () => {
    const html = listingBody({ ...LISTING, status: "Public", shareToken: "s3cret", userId: "u-1" });
    expect(html).not.toContain("s3cret");
    expect(html).not.toContain("u-1");
    expect(html).not.toContain("Public");
  });

  it("escapes everything that came from the quiz", () => {
    const html = listingBody({
      ...LISTING,
      title: '<script>alert(1)</script>',
      description: '"><img src=x onerror=alert(1)>',
      author: "<b>me</b>",
      category: "A & B",
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("A &amp; B");
  });

  it("calls a board a board, and leaves out a duration of 0", () => {
    const html = listingBody({ ...LISTING, format: "Associations", questionCount: 0, timeLimitInSeconds: 0 });
    expect(html).toContain("Associations board");
    expect(html).not.toContain("0 questions");
    expect(html).not.toContain("0s");
    expect(html).toContain('<a href="/associations/32/play">Play</a>');
  });
});

describe("describeListing", () => {
  it("is the author's description, or one written from the facts", () => {
    expect(describeListing(LISTING)).toBe("Pjesët e makinës.");
    expect(describeListing({ ...LISTING, description: null })).toBe("12 questions · Cars. Play it on Oxygen Quiz.");
  });
});

describe("playPath", () => {
  it("goes to each format's own play screen", () => {
    expect(playPath({ id: 3, format: "Classic" })).toBe("/quiz/3/play");
    expect(playPath({ id: 3, format: "Associations" })).toBe("/associations/3/play");
  });
});

describe("sitemapXml", () => {
  it("lists the home page, the catalogue and one URL per quiz with its lastmod", () => {
    const xml = sitemapXml([
      { id: 32, title: "Kërrë gjeneral për makina", updatedAt: "2026-10-02T08:30:00.123Z" },
      { id: 7, title: "Москва", updatedAt: "2026-09-01T00:00:00Z" },
    ]);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain("<loc>https://oxygenquiz.com/</loc>");
    expect(xml).toContain("<loc>https://oxygenquiz.com/choose-quiz</loc>");
    expect(xml).toContain(
      "<url><loc>https://oxygenquiz.com/q/32/kerre-gjeneral-per-makina</loc><lastmod>2026-10-02T08:30:00Z</lastmod></url>",
    );
    expect(xml).toContain("<url><loc>https://oxygenquiz.com/q/7</loc><lastmod>2026-09-01T00:00:00Z</lastmod></url>");
  });

  it("writes a date the API sends without a zone as UTC", () => {
    // System.Text.Json writes a DateTime read back from Postgres with Kind=Utc, but a Kind of
    // Unspecified serialises with no offset — the sitemap must not shift it into a local time.
    expect(sitemapXml([{ id: 1, title: "A", updatedAt: "2026-10-02T08:30:00" }])).toContain(
      "<lastmod>2026-10-02T08:30:00Z</lastmod>",
    );
  });
});
