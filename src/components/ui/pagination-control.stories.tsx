import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { PaginationControls } from "./pagination-control";

/**
 * Teaching example: a SINGLE, prop-driven component.
 *
 * PaginationControls takes a `pagination` object + an `onPageChange` callback and
 * renders itself — it never fetches data. So a story is just "render it with these
 * props". Each exported `Story` below is one state you can flip between in the
 * sidebar. Clicking page buttons logs to the Storybook "Actions" tab via `fn()`.
 */
const meta = {
  title: "UI/PaginationControls",
  component: PaginationControls,
  // This component is small, so center it instead of the global fullscreen layout.
  parameters: { layout: "centered" },
  args: {
    // A spy function: every call shows up in the Actions panel.
    onPageChange: fn(),
  },
} satisfies Meta<typeof PaginationControls>;

export default meta;
type Story = StoryObj<typeof meta>;

const base = { itemsPerPage: 10, totalItems: 200 };

export const FirstPage: Story = {
  args: {
    pagination: {
      ...base,
      currentPage: 1,
      totalPages: 20,
      hasPreviousPage: false,
      hasNextPage: true,
    },
  },
};

export const MiddlePage: Story = {
  args: {
    pagination: {
      ...base,
      currentPage: 10,
      totalPages: 20,
      hasPreviousPage: true,
      hasNextPage: true,
    },
  },
};

export const LastPage: Story = {
  args: {
    pagination: {
      ...base,
      currentPage: 20,
      totalPages: 20,
      hasPreviousPage: true,
      hasNextPage: false,
    },
  },
};

/** Few pages → the First/Last skip buttons hide (totalPages <= 3). */
export const FewPages: Story = {
  args: {
    pagination: {
      itemsPerPage: 10,
      totalItems: 25,
      currentPage: 1,
      totalPages: 3,
      hasPreviousPage: false,
      hasNextPage: true,
    },
  },
};
