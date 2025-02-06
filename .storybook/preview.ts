import type { Preview } from "@storybook/react";
import '../src/global.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(muted|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
