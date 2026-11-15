import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const post = vi.fn();
vi.mock("@/lib/Api-client", () => ({
  api: { post: (...a: unknown[]) => post(...a) },
  apiErrorMessage: () => "x",
}));

import { QuestionType } from "@/types/question-types";
import { queryConfig } from "@/lib/React-query";
import { cleanImageQuery, parseAiOutput, pictureIsNamedInQuestion, MAX_IMAGE_QUERIES } from "../parse-ai-output";
import { useAutoImages } from "../use-auto-images";
import { describePictures } from "../components/picture-description";
import { ReviewChips } from "../components/review-chips";
import { ImportNotices } from "../components/import-notices";
import { describeImport } from "../components/import-description";
import { DifficultySlider } from "../components/difficulty-slider";
import { ImageIcon } from "lucide-react";
import { parseContext } from "../__fixtures__/ai-quiz.fixtures";

/**
 * "Add images" (docs/media/media-pipeline.md, "AI-added images"): the model may name a picture to
 * search for; the parser keeps only a plain phrase, and our code finds and imports the image.
 */

const tf = (text: string, imageQuery?: unknown) => ({
  type: QuestionType.TrueFalse,
  text,
  difficulty: "Easy",
  correctAnswer: true,
  ...(imageQuery !== undefined ? { imageQuery } : {}),
});

const reply = (questions: unknown[]) => JSON.stringify({ questions });

describe("the model's image search phrase", () => {
  it("is kept as a plain phrase, and dropped when it is a link, a file name or a description", () => {
    expect(cleanImageQuery("  Flag   of Kosovo ")).toBe("Flag of Kosovo");
    expect(cleanImageQuery("https://upload.wikimedia.org/flag.png")).toBeUndefined();
    expect(cleanImageQuery("www.example.com/flag")).toBeUndefined();
    expect(cleanImageQuery("Flag_of_Kosovo.svg")).toBeUndefined();
    expect(cleanImageQuery("a".repeat(81))).toBeUndefined();
    expect(cleanImageQuery(42)).toBeUndefined();
    expect(cleanImageQuery("x")).toBeUndefined();
  });

  it("rides on the parsed question, and no more than ten questions get one", () => {
    const questions = Array.from({ length: 12 }, (_, i) => tf(`Is statement number ${i + 1} true?`, `Subject ${i + 1}`));
    const result = parseAiOutput(reply([...questions, tf("No picture here, is that right?")]), parseContext);

    const withQuery = result.questions.filter((q) => q.imageQuery);
    expect(withQuery).toHaveLength(MAX_IMAGE_QUERIES);
    expect(result.questions[0].imageQuery).toBe("Subject 1");
    expect(result.questions[12].imageQuery).toBeUndefined();
    // Nothing is attached by the parser: a phrase is not an image until our code finds one.
    expect(result.questions[0].question.media).toBeNull();
  });

  it("is dropped when the question already names what the picture would show", () => {
    // Decoration: the text says who or what it is, so the picture gives the player nothing to do.
    expect(pictureIsNamedInQuestion("Marie Curie was the first woman to win a Nobel Prize.", "Marie Curie")).toBe(true);
    expect(pictureIsNamedInQuestion("Mount Everest was most recently measured at 8,848.86 m in 2020.", "Mount Everest")).toBe(true);
    expect(pictureIsNamedInQuestion("Në cilin vit u lind Skënderbeu?", "Skenderbeu")).toBe(true);
    expect(pictureIsNamedInQuestion("Is Mercury the smallest planet?", "Mercury (planet)")).toBe(true);

    // A picture question points at the picture and leaves the name out.
    expect(pictureIsNamedInQuestion("Who is this scientist?", "Marie Curie")).toBe(false);
    expect(pictureIsNamedInQuestion("Which country's flag is this?", "Flag of Kosovo")).toBe(false);
    expect(pictureIsNamedInQuestion("Which planet is shown here?", "Mercury (planet)")).toBe(false);
  });

  it("leaves the question in the quiz when its picture is dropped", () => {
    const result = parseAiOutput(
      reply([
        tf("Marie Curie was the first woman to win a Nobel Prize.", "Marie Curie"),
        tf("The scientist shown here won two Nobel Prizes.", "Marie Curie"),
      ]),
      parseContext
    );

    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].imageQuery).toBeUndefined();
    expect(result.questions[1].imageQuery).toBe("Marie Curie");
  });
});

describe("useAutoImages", () => {
  const ASSET = {
    id: "8f7e3c1a-1111-4222-8333-444455556666",
    kind: "Image",
    url: "https://media.test/flag.webp",
    byteSize: 1,
    credit: { provider: "Wikimedia Commons", line: "Jane · CC0 · Wikimedia Commons", sourceUrl: "https://commons.wikimedia.org/wiki/File:F.svg" },
  };

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: queryConfig })}>{children}</QueryClientProvider>
  );

  // Braced: a function returned from beforeEach is run as a cleanup hook.
  beforeEach(() => {
    post.mockReset();
  });

  it("asks our server for each phrase and hands the builder the questions with their pictures", async () => {
    post.mockImplementation((_url: string, body: { query: string }) =>
      body.query === "Flag of Kosovo"
        ? Promise.resolve({ data: ASSET })
        : Promise.reject({ response: { status: 404 } }),
    );
    const result = parseAiOutput(
      reply([tf("Does the flag shown here belong to a Balkan country?", "Flag of Kosovo"), tf("Is the sky blue on a clear day?"), tf("Is the city shown here a real place?", "Atlantis")]),
      parseContext,
    );

    const { result: hook } = renderHook(() => useAutoImages(result), { wrapper });

    expect(hook.current.pending).toBe(true);
    await waitFor(() => expect(hook.current.pending).toBe(false));

    expect(post).toHaveBeenCalledTimes(2); // only the questions that asked
    expect(post).toHaveBeenCalledWith("/media/stock/auto", { query: "Flag of Kosovo" }, expect.anything());
    expect(hook.current.questions[0].question.media).toEqual({
      assetId: ASSET.id,
      url: ASSET.url,
      kind: "Image",
      credit: { line: ASSET.credit.line, url: ASSET.credit.sourceUrl },
    });
    expect(hook.current.questions[1].question.media).toBeNull();
    expect(hook.current.notFound).toEqual([3]);
  });

  it("isn't pending when nothing asked for a picture, and Skip goes on without waiting", async () => {
    post.mockReturnValue(new Promise(() => {})); // never answers
    const none = parseAiOutput(reply([tf("Is water wet in everyday speech?")]), parseContext);
    expect(renderHook(() => useAutoImages(none), { wrapper }).result.current.pending).toBe(false);

    const one = parseAiOutput(reply([tf("Is this Rome?", "Colosseum")]), parseContext);
    const { result: hook } = renderHook(() => useAutoImages(one), { wrapper });
    expect(hook.current.pending).toBe(true);
    act(() => hook.current.skip());
    expect(hook.current.pending).toBe(false);
    expect(hook.current.notFound).toEqual([1]);
  });
});

describe("the review's note about pictures", () => {
  it("says nothing when pictures were off", () => {
    expect(describePictures({ requested: 0, notFound: [] })).toBeNull();
  });

  it("says so when pictures were on and the AI wrote no picture question", () => {
    // Before, this showed nothing — and "the AI chose none" looked like a broken feature.
    const note = describePictures({ requested: 0, notFound: [], asked: true });
    expect(note?.chip).toBe("No picture questions");
    expect(note?.lead).toContain("the AI wrote no question that asks about one");
  });

  it("counts what was added and names the questions that got none", () => {
    const note = describePictures({ requested: 3, notFound: [2], asked: true });
    expect(note?.chip).toBe("2 pictures added");
    expect(note?.lead).toContain("Added a picture to 2 questions");
    expect(note?.detail).toContain("None found for question 2");
    expect(describePictures({ requested: 1, notFound: [], asked: true })?.chip).toBe("1 picture added");
  });

  it("says when every search came back empty", () => {
    const note = describePictures({ requested: 2, notFound: [1, 2], asked: true });
    expect(note?.chip).toBe("No pictures found");
    expect(note?.lead).toContain("No pictures were found for the questions that asked for one");
  });
});

describe("ReviewChips", () => {
  afterEach(cleanup);

  const items = [
    { id: "source", icon: ImageIcon, label: "8 Wikipedia articles", detail: <a href="https://en.wikipedia.org/wiki/Volcano">Volcano</a> },
    { id: "pictures", icon: ImageIcon, label: "2 pictures added", detail: <p>Check each one.</p> },
  ];

  it("is one line of chips until one is opened, and nothing at all with nothing to say", () => {
    const { container } = render(<ReviewChips items={[]} />);
    expect(container.innerHTML).toBe("");
    cleanup();

    render(<ReviewChips items={items} />);
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["8 Wikipedia articles", "2 pictures added"]);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("opens a chip's detail on a press — the article links are still one press away", async () => {
    render(<ReviewChips items={items} />);
    const chip = screen.getByRole("button", { name: "8 Wikipedia articles" });
    expect(chip.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(chip);

    expect(chip.getAttribute("aria-expanded")).toBe("true");
    expect((await screen.findByRole("link", { name: "Volcano" })).getAttribute("href")).toBe(
      "https://en.wikipedia.org/wiki/Volcano",
    );
  });

  it("puts what the parser dropped in the same row, by count, with the reasons a press away", async () => {
    const result = parseAiOutput(
      reply([tf("Is the sky blue on a clear day?"), { type: QuestionType.TrueFalse, text: "No answer given here." }]),
      parseContext,
    );
    const label = describeImport(result);
    expect(label).toBe("1 question skipped");
    expect(describeImport(parseAiOutput(reply([tf("Is the sky blue on a clear day?")]), parseContext))).toBeNull();

    render(
      <ReviewChips
        items={[{ id: "import", icon: ImageIcon, label: label!, tone: "problem", detail: <ImportNotices result={result} /> }]}
      />,
    );
    expect(screen.queryByText(/could not be used/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "1 question skipped" }));
    expect((await screen.findByText(/could not be used/)).textContent).toContain("Some of what came back");
    expect(screen.getByRole("status").textContent).toContain("Skipped question 2");
  });
});

describe("DifficultySlider", () => {
  afterEach(cleanup);

  const levels = [
    { id: 11, label: "Easy" },
    { id: 12, label: "Medium" },
    { id: 13, label: "Hard" },
  ];

  it("is a slider with one stop per level, saying the level's name", () => {
    render(<DifficultySlider levels={levels} valueId={12} onChange={() => {}} />);
    const slider = screen.getByRole("slider");

    expect(slider.getAttribute("max")).toBe("2");
    expect((slider as HTMLInputElement).value).toBe("1");
    expect(slider.getAttribute("aria-valuetext")).toBe("Medium");
  });

  it("reports the level it was moved to, by id", () => {
    const onChange = vi.fn();
    render(<DifficultySlider levels={levels} valueId={12} onChange={onChange} />);

    fireEvent.change(screen.getByRole("slider"), { target: { value: "2" } });
    expect(onChange).toHaveBeenLastCalledWith(13);
    // The names under the track are a shortcut to the same thing.
    fireEvent.click(screen.getByText("Easy"));
    expect(onChange).toHaveBeenLastCalledWith(11);
  });

  it("is nothing when there is nothing to choose between", () => {
    const { container } = render(<DifficultySlider levels={levels.slice(0, 1)} valueId={11} onChange={() => {}} />);
    expect(container.innerHTML).toBe("");
  });
});
