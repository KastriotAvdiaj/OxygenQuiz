import type { Meta, StoryObj } from "@storybook/react";

import { LoadingWave } from "./loading-wave";

/**
 * `LoadingWave` is a word-mark loader: the letters of `text` rise and fall one
 * after another, sending a wave across the word. It's purely prop-driven, so
 * each story below is just the component rendered with a different set of props.
 *
 * Use the Controls tab to live-tweak `text`, `size`, `variant` and `speed`.
 */
const meta = {
  title: "UI/LoadingWave",
  component: LoadingWave,
  parameters: { layout: "centered" },
  argTypes: {
    size: {
      control: "inline-radio",
      options: ["sm", "md", "lg", "xl"],
    },
    variant: {
      control: "inline-radio",
      options: ["primary", "muted", "quiz"],
    },
    speed: {
      control: { type: "range", min: 400, max: 2500, step: 100 },
    },
    text: { control: "text" },
  },
  args: {
    text: "LOADING",
    size: "lg",
    variant: "primary",
    speed: 1200,
  },
} satisfies Meta<typeof LoadingWave>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The default loader — matches the reference design. */
export const Default: Story = {};

/** Muted foreground, e.g. for subtle inline / overlay loaders. */
export const Muted: Story = {
  args: { variant: "muted" },
};

/** Brand-coloured, for quiz-themed screens. */
export const Quiz: Story = {
  args: { variant: "quiz" },
};

/** A snappier wave. */
export const Fast: Story = {
  args: { speed: 700 },
};

/** A slow, gentle wave. */
export const Slow: Story = {
  args: { speed: 2000 },
};

/** Custom text — any word works; spaces are preserved. */
export const CustomText: Story = {
  args: { text: "PLEASE WAIT" },
};

/** Every size, stacked, to compare the hop scaling. */
export const AllSizes: Story = {
  render: (args) => (
    <div className="flex flex-col items-start gap-6">
      <LoadingWave {...args} size="sm" />
      <LoadingWave {...args} size="md" />
      <LoadingWave {...args} size="lg" />
      <LoadingWave {...args} size="xl" />
    </div>
  ),
};
