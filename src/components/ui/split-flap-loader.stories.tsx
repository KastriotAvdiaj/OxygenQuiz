import type { Meta, StoryObj } from "@storybook/react";

import { SplitFlapLoader } from "./split-flap-loader";

/**
 * A full-bleed split-flap board, for a wait the user is meant to sit through.
 *
 * NOT the app's default loader — that is `LoadingWave`, which is what the quiz flow, the
 * dashboard lists and the boot screen all render. This one is deliberately louder: a second
 * per flip, the whole screen, a mechanical object rather than a word breathing. It was the
 * quiz flow's loader for a while and lost the job for being too big a gesture for a gap that
 * is often over in 200ms (docs/quiz/quiz-playing-architecture.md §3b). It is kept because
 * the effect is good and some other moment will want it.
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
  title: "UI/SplitFlapLoader",
  component: SplitFlapLoader,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof SplitFlapLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The default props, for anyone dropping the component in without thinking about copy. */
export const Defaults: Story = {};

/** Two phrases of similar length — the shape the board is happiest in. */
export const TwoPhrases: Story = {
  args: {
    words: ["SHUFFLING", "THE DECK"],
    label: "Shuffling",
  },
};

/**
 * A single phrase. Renders correctly and then NEVER MOVES — SplitFlapText animates on a
 * phrase change and nothing else. Kept as the cautionary story: if a board ever looks
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
    words: ["LOADING", "PLEASE WAIT"],
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
