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
 * WHAT TO WATCH FOR HERE: three rotations are stacked, and you need a few seconds to
 * see all of them — the slow pitch-and-roll tumble (11s), the yaw underneath it (18s),
 * and a Y slice turning on its own delay (12s). None of the periods divide into each
 * other, so the loop never lands in the same place twice.
 *
 * It is CSS 3D, not a canvas: 26 cubies of six faces each and `transform-style:
 * preserve-3d`, all of it in `global.css` under `.rubiks*`. Twenty-six because (0,0,0)
 * is the spindle on a real cube, and rendering it here changed nothing — it is sealed
 * inside the others, and what shows through the seams is their unstickered inner faces.
 *
 * `still` is the snapshot-safe pose. Users who ask for reduced motion get it from a
 * media query without any caller opting in.
 */
const meta = {
  title: "Dashboard/Quiz/RubiksCube",
  component: RubiksCube,
  parameters: { layout: "centered" },
} satisfies Meta<typeof RubiksCube>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The size the overlay renders it at. Give it a few seconds — the slices turn on delays. */
export const Turning: Story = {
  args: { cubieSize: 40 },
};

/**
 * The moment the questions land: one pop, and the yaw speeds up from 18s to 7s.
 *
 * It does not re-solve itself. Swapping in a "snap every layer to zero" animation
 * jumps, because CSS resolves the new keyframe's implicit `from` against the
 * underlying style rather than the frame you were on — see `.rubiks-solved`.
 */
export const Solved: Story = {
  args: { cubieSize: 40, solved: true },
};

/** What reduced-motion users see, and what a visual snapshot should compare against. */
export const Still: Story = {
  args: { cubieSize: 40, still: true },
};

/** It scales off one custom property, so a caller only ever passes a cubie size. */
export const Small: Story = {
  args: { cubieSize: 16 },
};
