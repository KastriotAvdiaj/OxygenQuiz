import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  // Pick up every *.stories.tsx (and .mdx docs) anywhere under src.
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@chromatic-com/storybook",
    "@storybook/addon-interactions",
    "@storybook/addon-a11y",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  // The react-vite builder automatically merges the project's vite.config.ts,
  // so the "@/..." path alias resolves in stories with no extra config.
};

export default config;
