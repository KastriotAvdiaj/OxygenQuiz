import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { AiGrounding } from "../../../api/generate-ai-quiz";
import { SourceNote } from "../components/source-note";

/**
 * The line above a generated quiz that says what it was written from
 * (docs/quiz/ai-quiz-generation-flow.md §2e, §2f). Each link is also the article's attribution,
 * so "every article is named and linked" is a licence requirement, not decoration.
 */
const article = (title: string) => ({
  provider: "wikipedia",
  title,
  url: `https://en.wikipedia.org/wiki/${title.replace(/ /g, "_")}`,
});

const grounded = (source: Partial<NonNullable<AiGrounding["source"]>>): AiGrounding => ({
  status: "Grounded",
  language: "English",
  source: { provider: "wikipedia", title: "Photosynthesis", url: null, text: "…", language: "English", ...source },
});

/** The note's words, as one string. No jest-dom matchers in this project, so read the text. */
const noteText = () => screen.getByRole("status").textContent ?? "";

describe("SourceNote", () => {
  afterEach(cleanup);

  it("names and links the one article a quiz was written from", () => {
    render(<SourceNote grounding={grounded(article("Photosynthesis"))} />);

    expect(noteText()).toContain("Written from the Wikipedia article Photosynthesis");
    expect(screen.getByRole("link", { name: "Photosynthesis" }).getAttribute("href")).toBe(
      "https://en.wikipedia.org/wiki/Photosynthesis",
    );
  });

  it("names and links every article of a broad topic, not the topic", () => {
    const parts = ["Solar System", "French Revolution", "Amazon River"].map(article);
    render(<SourceNote grounding={grounded({ title: "General Knowledge", url: null, parts })} />);

    expect(noteText()).toContain(
      "Written from 3 Wikipedia articles: Solar System, French Revolution, Amazon River",
    );
    // The topic is not an article, so it is neither named as one nor linked.
    expect(noteText()).not.toContain("General Knowledge");
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(
      parts.map((part) => part.url),
    );
  });

  it("shows an article with no address as plain text", () => {
    const parts = [article("Solar System"), { provider: "wikipedia", title: "Amazon River", url: null }];
    render(<SourceNote grounding={grounded({ title: "General Knowledge", parts })} />);

    expect(noteText()).toContain("Solar System, Amazon River");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("says when a broad topic found too few articles and was written from memory", () => {
    render(<SourceNote grounding={{ status: "Ungrounded", language: "Albanian", reason: "too-few-articles" }} />);

    expect(noteText()).toContain("too few articles were found for a topic this wide");
  });

  it("renders nothing when grounding is off", () => {
    const { container } = render(<SourceNote grounding={null} />);

    expect(container.innerHTML).toBe("");
  });
});
