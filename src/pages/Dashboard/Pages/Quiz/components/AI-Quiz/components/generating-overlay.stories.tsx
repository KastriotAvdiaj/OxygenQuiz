import type { Decorator, Meta, StoryObj } from "@storybook/react";

import { GeneratingOverlay } from "./generating-overlay";

/**
 * The screen while the model writes a quiz.
 *
 * <b>What to watch for here.</b> The status line is on a clock, not on the server —
 * there is no streaming, so nothing can be read from the request (known issue 12 in
 * docs/quiz/ai-quiz-generation-flow.md). Sit on a story for half a minute and it walks
 * the whole script: send → draft → options → check → "still going". The last line is the
 * one to judge, because it is the one a real slow generation lands on.
 *
 * <b>The backdrop is fake.</b> These stories render a stand-in form behind the overlay so
 * the blur has something to blur; the real thing sits over the wizard. For the genuine
 * article see `Dashboard/Quiz/AiQuizWizardView` → `Generating`, and `LeavingMidGeneration`
 * for the one pairing that matters: the leave dialog opening *on top* of this. That
 * stacking is why this is a plain fixed layer at z-40 rather than a second Radix dialog.
 *
 * <b>Not the app's loader.</b> Every ordinary wait is `LoadingWave`. This is a set-piece
 * for the one action that is slow, metered and uncancellable — see `RubiksCube` for why
 * that exception was made and why it should stay at one.
 */
const withMockedWizard: Decorator = (Story) => (
  <div className="min-h-screen bg-background">
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Create a quiz with AI</h1>
      <div className="space-y-4 rounded-xl border-2 border-primary/30 bg-background p-6">
        <p className="text-sm font-medium">What should this quiz be about?</p>
        <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
          The French Revolution
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="h-10 rounded-lg border border-border bg-card" />
          <div className="h-10 rounded-lg border border-border bg-card" />
          <div className="h-10 rounded-lg border border-border bg-card" />
        </div>
      </div>
    </div>
    <Story />
  </div>
);

const meta = {
  title: "Dashboard/Quiz/GeneratingOverlay",
  component: GeneratingOverlay,
  parameters: { layout: "fullscreen" },
  decorators: [withMockedWizard],
} satisfies Meta<typeof GeneratingOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Topic mode: the model is inventing the material, so the heading says writing. */
export const Topic: Story = {
  args: { phase: "generating", mode: "Topic" },
};

/**
 * Source mode changes the heading, and only the heading. The user pasted the material —
 * telling them we're "writing" it would misdescribe what they asked for.
 */
export const SourceMaterial: Story = {
  args: { phase: "generating", mode: "Source" },
};

/**
 * The questions landed. The cube pops and spins faster, the copy turns over, and
 * `useGenerationWait` holds this for 1.4s before the layer fades off the review step.
 *
 * Read the copy carefully: it says questions, not a saved quiz, because nothing has
 * been saved. The reply is parsed in the browser and the review step is where the user
 * accepts it — a "quiz created" here would be the one lie on a screen whose whole job
 * is to report what happened.
 */
export const Landed: Story = {
  args: { phase: "succeeded", mode: "Topic", questionCount: 12 },
};

/**
 * The count is optional — a reply that needed a category picked first arrives without
 * one, and the line falls back rather than inventing a number.
 */
export const LandedWithoutCount: Story = {
  args: { phase: "succeeded", mode: "Topic" },
};

/**
 * The failure exit. It fades out still showing the working copy, on purpose: a
 * generation that failed has an error panel waiting behind this, and 300ms of "your
 * questions are ready" over a quota refusal is worse than no animation at all. That is
 * the whole reason `aborting` is a separate phase from `leaving`.
 *
 * Storybook renders it mid-fade; in the app it is gone ~300ms later.
 */
export const Aborting: Story = {
  args: { phase: "aborting", mode: "Topic" },
};
