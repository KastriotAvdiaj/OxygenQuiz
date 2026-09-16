import type { Meta, StoryObj } from "@storybook/react";

import { Typewriter } from "./typewriter";

/**
 * The typewriter `GeneratingOverlay` shows while the model writes a quiz.
 *
 * NOT a loader you can reach for. Every ordinary wait in the app is `LoadingWave`, on
 * purpose — a wait should not announce itself as a different thing each time
 * (quiz-loading-view.tsx). This is the second sanctioned exception after the split-flap
 * board, and it exists for one screen: AI generation runs 10-40 seconds with no
 * streaming, which is long enough that a spinner stops reading as progress.
 *
 * WHAT TO WATCH FOR HERE: three loops share one 3s clock, and that is the whole trick —
 * the carriage steps left, the page feeds up a line, a key dips 2px. They are meant to
 * land together, because parts of a machine move together. Give it a full cycle: the
 * page returns to the roller at the end and the piece bounces once as it resets.
 *
 * It is CSS, not a Lottie or a GIF: eleven boxes, of which four are elements — the
 * knobs, the levers, the ruled lines and all twelve keys are pseudo-elements and
 * box-shadows. The colours are `--primary` at runtime, so it follows the theme rather
 * than shipping twice for dark mode. All of it is in `global.css` under `.typewriter*`.
 *
 * Adapted from Uiverse.io by Nawsome (MIT).
 *
 * There is no "finished" pose, and that is deliberate — see the component's own note.
 * When the questions land the typing carries on; the overlay's copy is what turns over.
 *
 * `still` is the snapshot-safe pose. Users who ask for reduced motion get it from a
 * media query without any caller opting in.
 */
const meta = {
  title: "Dashboard/Quiz/Typewriter",
  component: Typewriter,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Typewriter>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The size the overlay renders it at. Give it a few seconds — one cycle is 3s. */
export const Typing: Story = {
  args: { scale: 1.6 },
};

/** What reduced-motion users see, and what a visual snapshot should compare against. */
export const Still: Story = {
  args: { scale: 1.6, still: true },
};

/** It scales off one custom property, so a caller only ever passes a number. */
export const Small: Story = {
  args: { scale: 0.7, still: true },
};
