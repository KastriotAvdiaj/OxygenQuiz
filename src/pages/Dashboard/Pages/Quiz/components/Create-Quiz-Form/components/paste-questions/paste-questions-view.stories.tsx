import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { buildPasteFormat } from "./paste-format";
import { PasteQuestionsView } from "./paste-questions-view";

/**
 * Paste questions in the quiz builder (docs/quiz/pasted-questions.md). The states worth seeing are
 * the ones you can't easily produce: a clipboard that refused, and a paste where nothing was
 * readable.
 */
const meta = {
  title: "Dashboard/Quiz/Builder/PasteQuestionsView",
  component: PasteQuestionsView,
  args: {
    open: true,
    onOpenChange: fn(),
    text: "",
    onTextChange: fn(),
    onCopyFormat: fn(),
    formatToCopyByHand: null,
    copied: false,
    onAdd: fn(),
    error: null,
    dropped: [],
  },
} satisfies Meta<typeof PasteQuestionsView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const FormatCopied: Story = { args: { copied: true } };

export const ClipboardBlocked: Story = {
  args: { formatToCopyByHand: buildPasteFormat([]) },
};

export const NothingReadable: Story = {
  args: {
    text: '{ "questions": [ { "type": "Essay", "text": "Discuss." } ] }',
    error: "None of the pasted questions could be read:",
    dropped: [
      { index: 1, text: "Discuss.", reason: 'isn\'t in a shape the app can read (the "type" field)' },
      { index: 2, text: "What is 2 + 2?", reason: "has no correct answer" },
    ],
  },
};

export const NoJson: Story = {
  args: {
    text: "Sure! Here are ten questions about Rome…",
    error:
      "Couldn't find any JSON in that response. Paste the AI's full reply, or ask it to reply with JSON only.",
  },
};
