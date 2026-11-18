import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import type { QuestionCategory, QuestionDifficulty } from "@/types/question-types";

import { buildQuickPlayTiles, MAX_SEEN, withSeenQuiz } from "../quick-play-model";
import { QuickPlayView, type QuickPlayViewProps } from "../quick-play-view";

const category = (id: number, name: string): QuestionCategory => ({
  id,
  name,
  createdAt: "",
  colorPaletteJson: '["#16a34a"]',
  gradient: false,
});
const difficulty = (id: number, level: string, weight: number): QuestionDifficulty => ({
  id,
  level,
  weight,
  createdAt: "",
});

const categories = [category(1, "Geography"), category(2, "History"), category(3, "Sport")];
// Out of order on purpose: the model sorts by weight.
const difficulties = [difficulty(30, "Hard", 3), difficulty(10, "Easy", 1), difficulty(20, "Medium", 2)];

describe("buildQuickPlayTiles", () => {
  const combos = [
    { categoryId: 1, difficultyId: 30, count: 1 },
    { categoryId: 1, difficultyId: 10, count: 2 },
    { categoryId: 2, difficultyId: 20, count: 5 },
    { categoryId: 99, difficultyId: 10, count: 4 }, // a category the lookup no longer has
  ];

  it("offers only categories with a quiz, the fullest first, each with its own difficulties in order", () => {
    const tiles = buildQuickPlayTiles(combos, categories, difficulties);

    expect(tiles.map((t) => t.name)).toEqual(["Surprise me", "History", "Geography"]);
    expect(tiles[2]).toMatchObject({ id: 1, count: 3, color: "#16a34a" });
    expect(tiles[2].levels).toEqual([
      { id: 10, label: "Easy", count: 2 },
      { id: 30, label: "Hard", count: 1 },
    ]);
  });

  it("puts every category behind the first tile, counting only what has a tile", () => {
    const [any] = buildQuickPlayTiles(combos, categories, difficulties);

    expect(any).toMatchObject({ id: "any", count: 8 });
    expect(any.levels.map((l) => [l.label, l.count])).toEqual([["Easy", 2], ["Medium", 5], ["Hard", 1]]);
  });

  it("has no any-category tile when there is one category, and no tiles when there is nothing", () => {
    expect(buildQuickPlayTiles(combos.slice(0, 2), categories, difficulties).map((t) => t.id)).toEqual([1]);
    expect(buildQuickPlayTiles([], categories, difficulties)).toEqual([]);
  });
});

describe("the quizzes this browser has been handed", () => {
  it("keeps the newest, each once, up to what the server reads", () => {
    expect(withSeenQuiz([4, 7, 9], 7)).toEqual([4, 9, 7]);
    const full = Array.from({ length: MAX_SEEN }, (_, i) => i + 1);
    const next = withSeenQuiz(full, 999);
    expect(next).toHaveLength(MAX_SEEN);
    expect(next[0]).toBe(2);
    expect(next.at(-1)).toBe(999);
  });
});

describe("QuickPlayView", () => {
  afterEach(cleanup);

  const tiles = buildQuickPlayTiles(
    [
      { categoryId: 1, difficultyId: 10, count: 2 },
      { categoryId: 1, difficultyId: 30, count: 1 },
      { categoryId: 2, difficultyId: 20, count: 5 },
    ],
    categories,
    difficulties,
  );
  const show = (props: Partial<QuickPlayViewProps> = {}) => {
    const handlers = { onSelect: vi.fn(), onPlay: vi.fn(), onPlayAgain: vi.fn(), onRetryLoad: vi.fn() };
    render(
      <MemoryRouter>
        <QuickPlayView tiles={tiles} selectedId={null} {...handlers} {...props} />
      </MemoryRouter>,
    );
    return handlers;
  };

  it("starts on the categories, one board each, with the full list one link away", () => {
    const { onSelect } = show();

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Where to?");
    // Fullest first, the surprise board on top, each saying how many quizzes it has.
    expect(screen.getAllByRole("listitem").map((li) => li.querySelector("button")?.getAttribute("aria-label"))).toEqual([
      "Surprise me, 8 quizzes",
      "History, 5 quizzes",
      "Geography, 3 quizzes",
    ]);
    expect(screen.getByRole("link", { name: /Browse all quizzes/ }).getAttribute("href")).toBe("/choose-quiz");
    fireEvent.click(screen.getByRole("button", { name: /Geography/ }));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("then asks how hard, offering only that category's difficulties, and the tap starts it", () => {
    const { onPlay, onSelect } = show({ selectedId: 1 });

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Geography");
    expect(screen.queryByRole("button", { name: /Medium/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Hard, 1 quiz" }));
    expect(onPlay).toHaveBeenLastCalledWith(30);
    fireEvent.click(screen.getByRole("button", { name: /Any difficulty/ }));
    expect(onPlay).toHaveBeenLastCalledWith(null);
    fireEvent.click(screen.getByRole("button", { name: "Change category" }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("shows only Any difficulty when the category has one level", () => {
    show({ selectedId: 2 });

    expect(screen.getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent)).toEqual([
      "Change category",
      "Any difficulty",
    ]);
  });

  it("says so when the player has had every quiz, and offers a repeat or the full list", () => {
    const { onPlayAgain } = show({ selectedId: 1, exhausted: true });

    expect(screen.getByRole("status").textContent).toContain("You've played every quiz here.");
    fireEvent.click(screen.getByRole("button", { name: /Play one again/ }));
    expect(onPlayAgain).toHaveBeenCalled();
    expect(screen.getAllByRole("link", { name: /Browse all quizzes/ })[0].getAttribute("href")).toBe("/choose-quiz");
  });

  it("holds every button while a quiz is being fetched", () => {
    show({ selectedId: 1, pending: 30 });

    expect(screen.getByRole("button", { name: /Any difficulty/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Hard, 1 quiz" }).getAttribute("aria-busy")).toBe("true");
  });

  it("says when there is nothing to quick play, and when the categories could not be loaded", () => {
    show({ tiles: [] });
    expect(screen.getByText("There's nothing to quick play yet.")).toBeTruthy();
    cleanup();

    const { onRetryLoad } = show({ tiles: [], loadFailed: true });
    fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
    expect(onRetryLoad).toHaveBeenCalled();
  });
});
