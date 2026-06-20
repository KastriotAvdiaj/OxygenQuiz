import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { TopNotification } from "./TopNotification";

/**
 * The "top-center" notification variant — an animated, quiz-styled toast (font-quiz,
 * shimmer, pulsing icon, auto-dismiss progress bar) intended for the quiz-facing pages.
 *
 * It's a pure prop-driven component: give it a `notification` + `onDismiss` and it renders
 * and animates itself, so every type/state is just a set of props. The companion bottom-left
 * toast lives in `Notification.tsx` (see Components/Notifications).
 *
 * Note on `timeout`: the component auto-dismisses after `timeout` ms (default 5000) and then
 * calls `onDismiss` — watch the Actions tab when it disappears. The showcase stories below use
 * a long timeout so they stay on screen for inspection; `AutoDismiss` uses a short one to
 * demonstrate the countdown + exit animation.
 */
const meta = {
  title: "Components/TopNotification",
  component: TopNotification,
  parameters: { layout: "centered" },
  args: {
    onDismiss: fn(),
    timeout: 60000, // long enough to inspect without it vanishing mid-look
  },
} satisfies Meta<typeof TopNotification>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    notification: {
      id: "1",
      type: "info",
      title: "Heads up!",
      message: "Your quiz starts in a few seconds.",
    },
  },
};

export const Success: Story = {
  args: {
    notification: {
      id: "2",
      type: "success",
      title: "Correct!",
      message: "Nice — +100 points.",
    },
  },
};

export const Warning: Story = {
  args: {
    notification: {
      id: "3",
      type: "warning",
      title: "10 seconds left",
      message: "Lock in your answer.",
    },
  },
};

export const Error: Story = {
  args: {
    notification: {
      id: "4",
      type: "error",
      title: "Time's up!",
      message: "That one timed out.",
    },
  },
};

/** Title only — no message line. */
export const TitleOnly: Story = {
  args: {
    notification: {
      id: "5",
      type: "success",
      title: "Answer submitted",
    },
  },
};

/** Short timeout to show the countdown bar draining and the auto-dismiss (fires onDismiss). */
export const AutoDismiss: Story = {
  args: {
    timeout: 4000,
    notification: {
      id: "6",
      type: "info",
      title: "This will disappear",
      message: "Auto-dismisses after 4 seconds.",
    },
  },
};
