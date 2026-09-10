import type { Meta, StoryObj } from "@storybook/react";

import { RubiksCube } from "./rubiks-cube";

/**
 * The cube `GeneratingOverlay` shows while the model writes a quiz.
 *
 * NOT a loader you can reach for. Every ordinary wait in the app is `LoadingWave`, on
 * purpose — a wait should not announce itself as a different thing each time
 * (quiz-loading-view.tsx). This is the second sanctioned exception after the split-flap
 * board, and it exists for one screen: AI generation runs 10-40 seconds with no
 * streaming, which is long enough that a spinner stops reading as progress.
 *
 * WHAT TO WATCH FOR HERE: it is CSS 3D, not a canvas — 27 cubies of six faces each,
 * `transform-style: preserve-3d`, and four keyframes in `global.css` (`.rubiks*`). The
 * three Y slices turn on staggered delays, and inner faces are plastic rather than
 * coloured, so a mid-turn cube shows its insides the way a real one does.
 *
 * `still` is the snapshot-safe pose. Users who ask for reduced motion get it from a
 * media query without any caller opting in.
 */
const meta = {
  title: "Quiz/AI/RubiksCube",
  component: RubiksCube,
  parameters: { layout: "centered" },
} satisfies Meta<typeof RubiksCube>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The size the overlay renders it at. Give it a few seconds — the slices turn on delays. */
export const Turning: Story = {
  args: { cubieSize: 34 },
};

/** What reduced-motion users see, and what a visual snapshot should compare against. */
export const Still: Story = {
  args: { cubieSize: 34, still: true },
};

/** It scales off one custom property, so a caller only ever passes a cubie size. */
export const Small: Story = {
  args: { cubieSize: 16 },
};
