import type { Meta, StoryObj } from "@storybook/react";

import { QuizLoadingView } from "./quiz-loading-view";

/**
 * The one loading screen of the quiz flow.
 *
 * Every waiting moment in the quiz renders this exact component: QuizPage and GuestQuizPage
 * while the session is created, QuizInterface before the FIRST question of a session, and
 * both results wrappers while the finished session loads. There is deliberately no loader
 * between two questions any more — the old question is held until the new one lands, so there
 * is no gap to fill (docs/quiz/quiz-playing-architecture.md §3d). That is the point of it
 * existing: there used to be look-alike cards with slightly different strings, and one of them
 * was not even reachable, which made "which loader am I looking at?" genuinely hard to answer
 * from a screenshot.
 *
 * WHY IT LOOKS LIKE THE REST OF THE APP: it renders `PageLoading` → `BlobLoader`, the same
 * loader as the boot screen, the dashboard lists and `QuizPageRouteWrapper` — which mounts
 * immediately before this one. Entering a quiz used to run LoadingWave → a split-flap board → the same
 * board again, and three different-looking waits inside a second and a half read as three
 * different things going wrong. The board itself is still around as `SplitFlapLoader` in
 * `components/ui`, for a moment that wants a set-piece.
 *
 * The loader looks the same everywhere on purpose. Which wait it is lives in `label`,
 * where a screen reader will actually use it.
 */
const meta = {
  title: "Quiz/QuizLoadingView",
  component: QuizLoadingView,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof QuizLoadingView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Entering the quiz — QuizPage and GuestQuizPage while the session is created. */
export const LoadingQuiz: Story = {
  args: { label: "Loading your quiz" },
};

/** The cold start — QuizInterface, before the first question of a session lands. */
export const LoadingFirstQuestion: Story = {
  args: { label: "Loading the first question" },
};

/** The results page, while the finished session loads. */
export const LoadingResults: Story = {
  args: { label: "Loading your results" },
};

/**
 * Narrow viewport. `BlobLoader`'s `xl` size steps down on phones (to 64px wide), so it
 * stays a loader rather than a centrepiece at 360px (docs/RESPONSIVE.md).
 */
export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
