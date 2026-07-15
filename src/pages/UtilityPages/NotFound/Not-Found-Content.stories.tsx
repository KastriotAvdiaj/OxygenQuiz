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
      <MemoryRouter>
        {/* Moving the centering div here applies it to ALL 3 stories automatically */}
        <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof NotFoundContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Global404Page: Story = {
  args: {
    title: "404 - Not Found",
    message: "Oops! The page you're looking for doesn't exist. It might have been moved or deleted.",
    linkText: "Go back to Home Page",
    linkTo: "/",
  },
};

export const ResourceNotFound: Story = {
  args: {
    title: "Resource Not Found",
    message: "The item you are looking for (e.g., a quiz or question) could not be found. It may have been deleted.",
    linkText: "Go to Dashboard",
    linkTo: "/dashboard",
  },
};

export const AccessDeniedHidden: Story = {
  args: {
    title: "404 - Not Found",
    message: "The requested address was not found on this server.",
    linkText: "Return to Lobby",
    linkTo: "/lobby",
  },
};