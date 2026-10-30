import type { Meta, StoryObj } from "@storybook/react";

import { SourceNote } from "./source-note";

/**
 * Where a grounded quiz came from — shown above the quiz overview with the other review notices
 * (the import report, the picture notice), in the same shape. Renders nothing with grounding off.
 *
 * In place: `Dashboard/Quiz/AiQuizWizardView` → `ReviewGrounded`, `ReviewFromMemoryWikipediaDown`.
 */
const meta = {
  title: "Dashboard/Quiz/AI/SourceNote",
  component: SourceNote,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-3xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SourceNote>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Grounded: the article is named and linked — also its CC BY-SA attribution. */
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

/** A long title on a phone wraps rather than overflowing the box. */
export const GroundedLongTitleOnMobile: Story = {
  args: {
    grounding: {
      status: "Grounded",
      language: "English",
      source: {
        provider: "wikipedia",
        title: "Balkans campaign (World War II)",
        url: "https://en.wikipedia.org/wiki/Balkans_campaign_(World_War_II)",
        text: "…",
        language: "English",
      },
    },
  },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

/** Written from a Microsoft Learn page — a "page", not an "article", and linked the same way. */
export const GroundedOnMicrosoftLearn: Story = {
  args: {
    grounding: {
      status: "Grounded",
      language: "English",
      source: {
        provider: "microsoft-learn",
        title: "What is Azure Functions?",
        url: "https://learn.microsoft.com/azure/azure-functions/functions-overview",
        text: "…",
        language: "English",
      },
    },
  },
};

/** Wikipedia was down and the author went ahead: the one amber notice. */
export const FromMemoryWikipediaDown: Story = {
  args: {
    grounding: { status: "Ungrounded", language: "Albanian", reason: "unavailable", unreachable: ["wikipedia"] },
  },
};

/** The same, when Microsoft Learn was the one down — the notice names it. */
export const FromMemoryMicrosoftLearnDown: Story = {
  args: {
    grounding: { status: "Ungrounded", language: "English", reason: "unavailable", unreachable: ["microsoft-learn"] },
  },
};

/** The author answered "none of these". */
export const FromMemoryDeclined: Story = {
  args: { grounding: { status: "Ungrounded", language: "English", reason: "declined" } },
};

/** No article matched the topic well enough, or the only match was a stub. */
export const FromMemoryNoArticle: Story = {
  args: { grounding: { status: "Ungrounded", language: "Albanian", reason: "not-found" } },
};

/** Grounding switched off: nothing at all. */
export const GroundingOff: Story = {
  args: { grounding: null },
};
