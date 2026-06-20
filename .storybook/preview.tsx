import type { Preview } from "@storybook/react";
import React from "react";

// The app's global stylesheet: Tailwind layers + every --background / --primary /
// --quiz-* CSS variable. Without this import, components render unstyled — this is
// the single most important line for making stories look like the real app.
import "../src/global.css";

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
  },

  // A theme switcher in the Storybook toolbar. The app applies a "dark"/"light"
  // class on <html>; we mirror that so theme variables resolve correctly.
  globalTypes: {
    theme: {
      description: "App theme",
      defaultValue: "dark",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "dark", title: "Dark" },
          { value: "light", title: "Light" },
        ],
        dynamicTitle: true,
      },
    },
  },

  decorators: [
    (Story, context) => {
      const theme = (context.globals.theme as "dark" | "light") ?? "dark";
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(theme);

      return (
        <div className="bg-background text-foreground font-app min-h-screen p-6">
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
