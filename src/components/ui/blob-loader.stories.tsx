import type { Meta, StoryObj } from "@storybook/react";

import { BlobLoader } from "./blob-loader";

/**
 * `BlobLoader` is the app's loader: a ball of liquid leaves the left bar, crosses, and is
 * swallowed by the right one. `PageLoading` renders it at `xl` for every full-page wait;
 * in-panel waits use it directly at `sm`/`md`/`lg`.
 *
 * Every size steps down on phones and up from `lg` — switch the viewport to `mobile1` to check. Use the
 * Controls tab to live-tweak `size`, `variant` and `speed`.
 */
const meta = {
  title: "UI/BlobLoader",
  component: BlobLoader,
  parameters: { layout: "centered" },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg", "xl"] },
    variant: { control: "inline-radio", options: ["primary", "muted", "quiz"] },
    speed: { control: { type: "range", min: 400, max: 2500, step: 100 } },
  },
  args: { size: "lg", variant: "primary", speed: 1000 },
} satisfies Meta<typeof BlobLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The default: primary, one crossing per second. */
export const Default: Story = {};

/** Muted foreground — available, though every current call site uses primary. */
export const Muted: Story = { args: { variant: "muted" } };

/** A slower, calmer crossing. */
export const Slow: Story = { args: { speed: 1800 } };

/** Every size side by side, to compare the goo at each blur radius. */
export const AllSizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-8">
      <BlobLoader {...args} size="sm" />
      <BlobLoader {...args} size="md" />
      <BlobLoader {...args} size="lg" />
      <BlobLoader {...args} size="xl" />
    </div>
  ),
};

/** Narrow viewport: `xl` steps down to 64px wide on phones. */
export const Mobile: Story = {
  args: { size: "xl" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
