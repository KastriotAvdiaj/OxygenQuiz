import type { Meta, StoryObj } from "@storybook/react";

import { QuizLoadingView } from "./quiz-loading-view";

/**
 * The one loading screen of the quiz flow — a split-flap board, no card.
 *
 * Every waiting moment in the quiz flow renders this exact component: QuizPage and
 * GuestQuizPage while the session is created, QuizInterface for the gap between two
 * questions, and both results wrappers while the finished session loads. That is the point
 * of it existing: there used to be look-alike cards with slightly different strings, and
 * one of them was not even reachable, which made "which loader am I looking at?" genuinely
 * hard to answer from a screenshot.
 *
 * WHAT TO WATCH FOR HERE: the board only animates when the phrase CHANGES, so `words`
 * needs two or more entries — a one-word board renders and then sits dead. Give it a few
 * seconds per story; `cycleDelay` is 1s.
 *
 * Also worth knowing: every phrase is padded to the longest one and the padding renders as
 * blank tiles, so phrases of wildly different lengths leave a ragged edge (LongestPhrase
 * below). And the flip charset is A-Z — lowercase input lands as a dead tile, which is why
 * every caller passes uppercase.
 */
const meta = {
  title: "Quiz/QuizLoadingView",
  component: QuizLoadingView,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof QuizLoadingView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The between-questions gap — what QuizInterface renders after you click Next. */
export const LoadingQuestion: Story = {
  args: {
    words: ["LOADING", "QUESTION"],
    label: "Loading the next question",
  },
};

/** Entering the quiz — what QuizPage and GuestQuizPage render while the session is created. */
export const LoadingQuiz: Story = {
  args: {
    words: ["LOADING", "YOUR QUIZ"],
    label: "Loading your quiz",
  },
};

/** The results page, while the finished session loads. */
export const LoadingResults: Story = {
  args: {
    words: ["LOADING", "RESULTS"],
    label: "Loading your results",
  },
};

/** The default props, for anyone dropping the component in without thinking about copy. */
export const Defaults: Story = {};

/**
 * A single phrase. Renders correctly and then NEVER MOVES — SplitFlapText animates on a
 * phrase change and nothing else. Kept as the cautionary story: if a loader ever looks
 * frozen in the app, this is the first thing to check.
 */
export const SingleWordDoesNotAnimate: Story = {
  args: {
    words: ["LOADING"],
    label: "Loading",
  },
};

/**
 * Mismatched lengths. The board sizes to the longest phrase and pads the rest with blank
 * tiles, so the short one sits against a run of empty flaps — check this before inventing
 * new copy.
 */
export const LongestPhraseSetsTheWidth: Story = {
  args: {
    words: ["NEXT", "SHUFFLING THE OPTIONS"],
    label: "Loading",
  },
};

/**
 * Narrow viewport. `fontSize` is a clamp() rather than a fixed px, so the tiles shrink with
 * the viewport instead of overflowing — resize the preview pane to see it move.
 */
export const Mobile: Story = {
  args: {
    words: ["LOADING", "QUESTION"],
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
