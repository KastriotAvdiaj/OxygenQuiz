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

/** A Wikipedia candidate as the server sends it: the title is also what's sent back. */
const article = (domain: "en" | "sq", title: string, words: number) => ({
  title,
  words,
  url: wiki(domain, title),
  provider: "wikipedia",
  key: title,
});

/** A Microsoft Learn candidate: the URL is what's sent back — Learn has many pages called "Overview". */
const learn = (title: string, words: number, url: string) => ({
  title,
  words,
  url,
  provider: "microsoft-learn",
  key: url,
});

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
        article("en", "Mercury (planet)", 16170),
        article("en", "Freddie Mercury", 17329),
        article("en", "Mercury (element)", 13576),
        article("en", "Mercury Prize", 3833),
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
        article("sq", "Historia e futbollit në Kosovë", 1473),
        article("sq", "Historia e Prishtinës", 2800),
        article("sq", "Historia e Vushtrrisë", 963),
        article("sq", "Komuna e Prishtinës", 665),
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
    question: { status: "SourceUnavailable", language: "Albanian", reason: "unavailable", unreachable: ["wikipedia"] },
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

/**
 * Both sources had candidates and neither was sure — real results for "Git branching" on
 * 2026-10-30. Every row now names its source, on a phone too: it is how the rows differ.
 */
export const WhichArticleFromTwoSources: Story = {
  args: {
    topic: "Git branching",
    question: {
      status: "NeedsArticle",
      language: "English",
      articles: [
        learn(
          "Adopt a Git branching strategy",
          1341,
          "https://learn.microsoft.com/azure/devops/repos/git/git-branching-guidance?view=azure-devops",
        ),
        learn(
          "About branches and branch policies",
          1069,
          "https://learn.microsoft.com/azure/devops/repos/git/branch-policies-overview?view=azure-devops",
        ),
        article("en", "Git", 7918),
        article("en", "Branching (version control)", 1090),
        article("en", "GitHub", 8195),
      ],
    },
  },
};

export const WhichArticleFromTwoSourcesOnMobile: Story = {
  args: WhichArticleFromTwoSources.args,
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

/**
 * Only Microsoft Learn had candidates — "New features in C# 12 and .NET 8" spans two of its
 * pages, and Wikipedia has neither. One source, so the header names it and the rows don't.
 */
export const WhichLearnPage: Story = {
  args: {
    topic: "New features in C# 12 and .NET 8",
    question: {
      status: "NeedsArticle",
      language: "English",
      articles: [
        learn("What's new in C# 12", 1410, "https://learn.microsoft.com/dotnet/csharp/whats-new/csharp-12"),
        learn(
          "What's new in the .NET 8 runtime",
          7172,
          "https://learn.microsoft.com/dotnet/core/whats-new/dotnet-8/runtime",
        ),
      ],
    },
  },
};

/** Microsoft Learn didn't answer: the outage card names the source that was down. */
export const MicrosoftLearnDown: Story = {
  args: {
    topic: "Azure Functions",
    question: { status: "SourceUnavailable", language: "English", reason: "unavailable", unreachable: ["microsoft-learn"] },
  },
};
