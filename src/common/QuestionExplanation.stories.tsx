import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { ExplanationField, ExplanationNote } from "./QuestionExplanation";

/**
 * A question's optional explanation — editor and player-facing note
 * (docs/quiz/question-explanations.md). The editor starts collapsed when empty and open when
 * there is one, which is what an AI-generated question arrives with.
 */
const meta = {
  title: "Common/QuestionExplanation",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const Editor = ({ initial }: { initial: string }) => {
  const [value, setValue] = useState(initial);
  return (
    <div className="max-w-xl">
      <ExplanationField value={value} onChange={setValue} />
    </div>
  );
};

export const EditorEmpty: Story = { render: () => <Editor initial="" /> };

export const EditorFromAi: Story = {
  render: () => (
    <Editor initial="Condensation is when water vapour cools and turns back into liquid — it's how clouds and dew form." />
  ),
};

export const Note: Story = {
  render: () => (
    <div className="max-w-xl">
      <ExplanationNote explanation="Rome has been the capital of Italy since 1871, after unification." />
    </div>
  ),
};
