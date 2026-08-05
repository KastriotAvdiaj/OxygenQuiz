import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { MemoryRouter } from "react-router-dom";
import { CreateQuizMethodDialog } from "./create-quiz-method-dialog";

/**
 * The fork users hit when they click "+ Create Quiz": build it by hand, or generate it
 * from source material with an AI.
 *
 * MemoryRouter decorator: the two cards are react-router `Link`s, which throw outside a
 * router. Same pattern as Not-Found-Content.stories.tsx. Clicking a card in a story
 * navigates the in-memory history, so nothing appears to happen — that's expected; the
 * `to` targets are visible in the Controls panel.
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
    aiPath: "/dashboard/quizzes/create-quiz/ai",
    onOpenChange: fn(),
  },
} satisfies Meta<typeof CreateQuizMethodDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As it sits on the Quiz Management page — just the trigger until someone clicks it. */
export const ClosedWithTrigger: Story = {
  args: { open: false },
};

/** The decision itself. Pinned open via the `open` prop so it can be reviewed directly. */
export const Open: Story = {
  args: { open: true },
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
    aiPath: "/my-dashboard/quizzes/create/ai",
  },
};

/** Once AI creation isn't news any more, drop `highlightAi` and the pill goes away. */
export const OpenWithoutNewBadge: Story = {
  args: { open: true, highlightAi: false },
};

/**
 * Phone width: the two cards stack (`grid-cols-1 sm:grid-cols-2`) and the dialog keeps a
 * 1rem gutter each side — the shared DialogContent owns that now, see docs/RESPONSIVE.md.
 */
export const OpenOnMobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  args: { open: true },
};
