import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { MemoryRouter } from "react-router-dom";
import { CreateQuizMethodDialog } from "./create-quiz-method-dialog";

/**
 * The fork users hit when they click "+ Create Quiz", in two steps: build it by hand or with
 * an AI, and then — for the AI branch — what the AI should work from.
 *
 * Step 2 is the wizard's old tab strip, moved. Every "which way?" decision for quiz creation
 * is made here now, which is what lets the wizard page be a form with one field instead of a
 * card wrapped in four navigational controls. See docs/quiz/ai-quiz-two-paths.md.
 *
 * Both steps render `ModeCard` at `size="compact"` — the same component as the player-facing
 * game-mode hub, so the two "pick how you want to do this" screens in the app look like one
 * app. Worth reviewing side by side with `Quiz/GameModeSelection` after any change to either.
 *
 * MemoryRouter decorator: the options navigate with `useNavigate`, which throws outside a
 * router. Same pattern as Not-Found-Content.stories.tsx. Clicking one in a story navigates
 * the in-memory history, so nothing appears to happen — that's expected; the targets are
 * visible in the Controls panel. Clicking "With AI", by contrast, *does* visibly do
 * something: it advances to step 2.
 *
 * Check both themes: the accents read from `--primary-edge`, `--foreground` and a green
 * mix, and the card's depth shadow is what carries them.
 */
const meta = {
  title: "Dashboard/Quiz/CreateQuizMethodDialog",
  component: CreateQuizMethodDialog,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: {
    manualPath: "/dashboard/quizzes/create-quiz",
    aiTopicPath: "/dashboard/quizzes/create-quiz/ai/topic",
    aiMaterialPath: "/dashboard/quizzes/create-quiz/ai/material",
    onOpenChange: fn(),
  },
} satisfies Meta<typeof CreateQuizMethodDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As it sits on the Quiz Management page — just the trigger until someone clicks it. */
export const ClosedWithTrigger: Story = {
  args: { open: false },
};

/** Step 1: the decision that was always here. Pinned open so it can be reviewed directly. */
export const Open: Story = {
  args: { open: true },
};

/**
 * Step 2, reached by pressing "With AI" — pinned via `initialStep` so it can be reviewed
 * without scripting a click.
 *
 * Two cards, matching step 1's grid, so the dialog doesn't change shape between steps.
 * "Use your own AI" is deliberately **not** a third card here: it isn't a different kind of
 * source, it's the same job run through someone else's model, and it lives as a quiet link
 * at the foot of the wizard page instead.
 *
 * "From my material" is disabled behind `AI_MATERIAL_MODE_ENABLED` — the server takes pasted
 * text today, but the mode users asked for is file upload (slice 2.3). It keeps its place in
 * the grid and drops every affordance that implies it will respond: no lift, no arrow, and
 * "Coming soon" in the foot row.
 */
export const AiSourceStep: Story = {
  args: { open: true, initialStep: "aiSource" },
};

/**
 * The user dashboard mounts the same flows under different paths
 * (`/my-dashboard/quizzes/create…`). Nothing about the dialog changes — this story exists
 * to show the component is route-agnostic, which is what stops a second copy of it from
 * being written for the other dashboard.
 */
export const OpenForUserDashboard: Story = {
  args: {
    open: true,
    manualPath: "/my-dashboard/quizzes/create",
    aiTopicPath: "/my-dashboard/quizzes/create/ai/topic",
    aiMaterialPath: "/my-dashboard/quizzes/create/ai/material",
  },
};

/**
 * Phone width: the cards stack (`grid-cols-1 sm:grid-cols-2`) into a `max-w-xs` column, the
 * same cap the game-mode hub uses so edge-to-edge cards don't read as page sections. The
 * dialog keeps a 1rem gutter each side — the shared DialogContent owns that, see
 * docs/RESPONSIVE.md.
 */
export const OpenOnMobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  args: { open: true },
};

/**
 * Step 2 at phone width: the cards stack into one capped column. Check that two stacked
 * cards plus the header don't push the dialog past its dvh cap (it scrolls if they do), and
 * that the back arrow stays on the title's line.
 */
export const AiSourceStepOnMobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  args: { open: true, initialStep: "aiSource" },
};
