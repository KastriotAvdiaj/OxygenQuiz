import type { Decorator, Meta, StoryObj } from "@storybook/react";

import { GeneratingOverlay } from "./generating-overlay";

/**
 * The card while a quiz is being written.
 *
 * <b>What to watch for here.</b> The steps are real: each story sets the `stage` the server
 * would have reported (docs/quiz/ai-quiz-generation-flow.md §3c), so stepping through
 * `Queued` → `FindingSources` → `Writing` → `Landed` is the whole wait. Only the hint under
 * the list is on a clock — sit on a story for 45 seconds and it stops promising "under a
 * minute".
 *
 * <b>The backdrop is fake.</b> These stories render a stand-in form behind the card so the
 * blur has something to blur; the real thing sits over the wizard. For the genuine article
 * see `Dashboard/Quiz/AiQuizWizardView` → `Generating`.
 */
const withMockedWizard: Decorator = (Story) => (
  <div className="min-h-screen bg-background">
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Create a quiz with AI</h1>
      <div className="space-y-4 rounded-xl border-2 border-primary/30 bg-background p-6">
        <p className="text-sm font-medium">What&apos;s this quiz about?</p>
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

const noop = () => {};

/** Just accepted. The first step turns; nothing has been reported yet. */
export const Queued: Story = {
  args: { phase: "generating", mode: "Topic", stage: "Queued", onKeepBrowsing: noop },
};

/** Grounding: a broad topic being planned, articles being looked up. */
export const FindingSources: Story = {
  args: { phase: "generating", mode: "Topic", stage: "FindingSources", onKeepBrowsing: noop },
};

/** The model call — nearly all of the wait. */
export const Writing: Story = {
  args: { phase: "generating", mode: "Topic", stage: "Writing", onKeepBrowsing: noop },
};

/** The author's own material: there are no sources to find, so the list is one step shorter. */
export const SourceMaterial: Story = {
  args: { phase: "generating", mode: "Source", stage: "Writing", onKeepBrowsing: noop },
};

/** Without a way to leave (a caller that passes none): the hint and the list stand alone. */
export const WithoutKeepBrowsing: Story = {
  args: { phase: "generating", mode: "Topic", stage: "Writing" },
};

/**
 * The questions landed. Every step is ticked, the count is named, and the footer has faded —
 * there is nothing left to leave. Held for a beat before the layer goes.
 */
export const Landed: Story = {
  args: { phase: "succeeded", mode: "Topic", stage: "Done", questionCount: 12, onKeepBrowsing: noop },
};

/** Landed, when the count isn't known (the confirm-details card comes next, not the review). */
export const LandedWithoutCount: Story = {
  args: { phase: "succeeded", mode: "Topic", stage: "Done", onKeepBrowsing: noop },
};

/**
 * A failure, or a question from grounding: the card fades as it stands, with no tick, because
 * what comes next is a panel explaining it. Storybook renders it mid-fade; in the app it is
 * gone ~300ms later.
 */
export const Aborting: Story = {
  args: { phase: "aborting", mode: "Topic", stage: "FindingSources", onKeepBrowsing: noop },
};
