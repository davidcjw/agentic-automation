import type { Preview } from "@storybook/react";
import "../src/styles/fonts.css";
import "../src/styles/tokens.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "paper",
      values: [
        { name: "paper", value: "__PAPER__" },
        { name: "ink", value: "__INK__" },
      ],
    },
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
  },
};

export default preview;
