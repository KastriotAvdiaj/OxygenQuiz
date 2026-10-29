import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { ImportNote } from "./import-note";

/**
 * The one line above the review builder that says where the questions came from. With
 * grounding on it is the provenance: the Wikipedia article, linked (which is also the CC BY-SA
 * attribution), or why the AI wrote from memory — amber only when Wikipedia was down and the
 * author went ahead anyway.
 *
 * In place, above the builder: `Dashboard/Quiz/AiQuizWizardView` → `ReviewGrounded` and
 * `ReviewFromMemoryWikipediaDown`.
 */
const meta = {
  title: "Dashboard/Quiz/AI/ImportNote",
  component: ImportNote,
  parameters: { layout: "padded" },
  args: { isFromTopic: true, onStartOver: fn() },
} satisfies Meta<typeof ImportNote>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Grounded: the article is named and linked. */
export const Grounded: Story = {
  args: {
    grounding: {
      status: "Grounded",
      language: "Albanian",
      source: {
        provider: "wikipedia",
        title: "Kuzhina shqiptare",
        url: "https://sq.wikipedia.org/wiki/Kuzhina_shqiptare",
        text: "…",
        language: "Albanian",
      },
    },
  },
};

/** Wikipedia was down and the author chose not to wait — the one warning line. */
export const FromMemoryWikipediaDown: Story = {
  args: { grounding: { status: "Ungrounded", language: "English", reason: "unavailable" } },
};

/** The author answered "none of these". */
export const FromMemoryDeclined: Story = {
  args: { grounding: { status: "Ungrounded", language: "English", reason: "declined" } },
};

/** No article matched the topic well enough (or the only match was a stub). */
export const FromMemoryNoArticle: Story = {
  args: { grounding: { status: "Ungrounded", language: "Albanian", reason: "not-found" } },
};

/** Grounding switched off: today's sentence, unchanged. */
export const GroundingOff: Story = {
  args: { grounding: null },
};

/** Source mode: the user's own material, so no fact-check advice — only Start over. */
export const FromOwnMaterial: Story = {
  args: { isFromTopic: false },
};
