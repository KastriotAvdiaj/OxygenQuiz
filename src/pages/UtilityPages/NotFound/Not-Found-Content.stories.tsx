import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { NotFoundContent } from "./Not-Found-Content";

const meta = {
  title: "Errors/NotFoundContent",
  component: NotFoundContent,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      // The component is a whole screen now (ErrorScreen): no centering wrapper needed.
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof NotFoundContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Global404Page: Story = {
  args: {
    title: "Page not found",
    message: "We looked everywhere — even the other side of the world. This page may have moved, or it never existed.",
    linkText: "Back home",
    linkTo: "/",
    secondary: { text: "Browse quizzes", to: "/choose-quiz" },
  },
};

/** What `DashboardErrorElement` shows when a quiz or question it loads is gone. */
export const ResourceNotFound: Story = {
  args: {
    title: "Not found",
    message: "The quiz or question you're looking for couldn't be found. It may have been deleted.",
    linkText: "Go to Dashboard",
    linkTo: "/dashboard",
  },
};

/**
 * A non-admin opening an admin-dashboard URL. `DashboardErrorElement` answers the gate's
 * "Hidden" 404 with the app's ordinary 404 page (`NotFoundRoute`), so the admin area is
 * indistinguishable from a URL that doesn't exist. This story used to carry its own copy
 * ("404 - Not Found", "Return to Lobby"), which showed a page nobody ever sees — it now uses
 * exactly the public 404's props, because matching it is the whole point.
 */
export const AccessDeniedHidden: Story = {
  args: Global404Page.args,
};
