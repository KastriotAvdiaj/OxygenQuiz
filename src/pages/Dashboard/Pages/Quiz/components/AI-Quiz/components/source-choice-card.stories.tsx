import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { SourceChoiceCard } from "./source-choice-card";

/**
 * Grounding's questions to the author — what the wizard shows instead of the topic box when the
 * server needs one answer before it can write from Wikipedia (docs/quiz/ai-quiz-generation-flow.md
 * §2e). Nothing has been spent at this point: the server asks before reserving any allowance.
 *
 * The data is real: the candidates are what Wikipedia's search returned for these topics on
 * 2026-10-29, as the server ranks them (best title match first, stubs left out).
 *
 * Seen in place, in the full wizard: `Dashboard/Quiz/AiQuizWizardView` → `GroundingAsks*`.
 * Compare it with `NeedsCategoryConfirmation` there — the same frame, the same kind of pause.
 */
const meta = {
  title: "Dashboard/Quiz/AI/SourceChoiceCard",
  component: SourceChoiceCard,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-3xl">
        <Story />
      </div>
    ),
  ],
  args: {
    topic: "Mercury",
    onPickLanguage: fn(),
    onPickArticle: fn(),
    onDecline: fn(),
    onRetry: fn(),
    onWriteFromMemory: fn(),
    onEditTopic: fn(),
  },
} satisfies Meta<typeof SourceChoiceCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const wiki = (domain: "en" | "sq", title: string) =>
  `https://${domain}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;

/**
 * "Python" exists on both Wikipedias — the programming language in English, the snake in
 * Albanian — so the topic's language can't be told and the author is asked. One click.
 */
export const WhichLanguage: Story = {
  args: {
    topic: "Python",
    question: { status: "NeedsLanguage", languages: ["English", "Albanian"] },
  },
};

/** "Mercury" is a disambiguation page: the planet, the element, the singer. */
export const WhichArticle: Story = {
  args: {
    topic: "Mercury",
    question: {
      status: "NeedsArticle",
      language: "English",
      articles: [
        { title: "Mercury (planet)", words: 16170, url: wiki("en", "Mercury (planet)") },
        { title: "Freddie Mercury", words: 17329, url: wiki("en", "Freddie Mercury") },
        { title: "Mercury (element)", words: 13576, url: wiki("en", "Mercury (element)") },
        { title: "Mercury Prize", words: 3833, url: wiki("en", "Mercury Prize") },
      ],
    },
  },
};

/**
 * No candidate is right: the best title match is the history of football in Kosovo. "None of
 * these" is the answer here, and its cost is stated on the row.
 */
export const WhichArticleNoneFits: Story = {
  args: {
    topic: "Historia e Kosovës në shekullin XX",
    question: {
      status: "NeedsArticle",
      language: "Albanian",
      articles: [
        { title: "Historia e futbollit në Kosovë", words: 1473, url: wiki("sq", "Historia e futbollit në Kosovë") },
        { title: "Historia e Prishtinës", words: 2800, url: wiki("sq", "Historia e Prishtinës") },
        { title: "Historia e Vushtrrisë", words: 963, url: wiki("sq", "Historia e Vushtrrisë") },
        { title: "Komuna e Prishtinës", words: 665, url: wiki("sq", "Komuna e Prishtinës") },
      ],
    },
  },
};

/**
 * Wikipedia didn't answer (twice — the server retries once). The author decides: wait a
 * minute, or go ahead from memory knowing the questions are far more likely to be wrong.
 */
export const WikipediaDown: Story = {
  args: {
    topic: "Rilindja Kombëtare",
    question: { status: "SourceUnavailable", language: "Albanian", reason: "unavailable" },
  },
};

/** After "Try again": the request is in flight, so every choice is locked until it answers. */
export const WikipediaDownRetrying: Story = {
  args: { ...WikipediaDown.args, busy: true },
};

/** Same card on a phone: the article rows keep their link button, the language rows stack. */
export const WhichArticleOnMobile: Story = {
  args: WhichArticle.args,
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
