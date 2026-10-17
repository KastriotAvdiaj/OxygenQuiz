import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { MemoryRouter } from "react-router-dom";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { ArrowRight } from "lucide-react";

import { LiftedButton } from "@/common/LiftedButton";
import { QuestionType } from "@/types/question-types";

import type { CreateQuizInput } from "../../../../api/create-quiz";
import {
  categories,
  difficulties,
  languages,
} from "../../../AI-Quiz/__fixtures__/ai-quiz.fixtures";
import { QuizQuestionProvider } from "../../Quiz-questions-context";
import { DEFAULT_QUESTION_SETTINGS, type NewAnyQuestion } from "../../types";
import { QuizOverview } from "./quiz-overview";

const base = { visibility: "Private", difficultyId: 2, categoryId: 1, languageId: 1 };

/** A generated quiz as it reaches review: every type, a long question, an explanation. */
const questions: NewAnyQuestion[] = [
  {
    ...base,
    id: -1,
    type: QuestionType.MultipleChoice,
    text: 'What does the word "test" most commonly refer to in an educational setting?',
    answerOptions: [
      { text: "A formal assessment of knowledge or skills", isCorrect: true },
      { text: "A type of laboratory equipment", isCorrect: false },
      { text: "A musical instrument", isCorrect: false },
      { text: "A kind of handwriting", isCorrect: false },
    ],
    allowMultipleSelections: false,
    explanation: "In education, a test is a formal assessment used to measure knowledge or skills.",
  },
  {
    ...base,
    id: -2,
    type: QuestionType.TrueFalse,
    text: "The SAT is a standardised test used for college admissions in the United States.",
    correctAnswer: true,
  },
  {
    ...base,
    id: -3,
    type: QuestionType.TypeTheAnswer,
    text: "What is the chemical symbol for gold?",
    correctAnswer: "Au",
    isCaseSensitive: false,
    allowPartialMatch: false,
    acceptableAnswers: [{ value: "Aurum" }],
    explanation: "From the Latin aurum.",
  },
];

/**
 * The overview needs what the builder gives it: the question context and react-hook-form's
 * field helpers. The harness supplies both — a real provider seeded with the fixtures and a
 * real form — rather than mocks, so the stories exercise the same reorder, reveal and editor
 * paths the app does.
 */
const Harness = ({ flow, seed }: { flow: "ai" | "build"; seed: NewAnyQuestion[] }) => {
  const form = useForm<CreateQuizInput>({
    defaultValues: {
      title: "Testing, testing",
      description: "A quick check of what tests are and where they're used.",
      categoryId: 1,
      difficultyId: 2,
      languageId: 1,
      status: "Public",
      showFeedbackImmediately: true,
      shuffleQuestions: false,
      questions: [],
    },
  });
  const [editing, setEditing] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <QuizQuestionProvider
      initialQuestions={seed.map((question, i) => ({
        question,
        settings: { ...DEFAULT_QUESTION_SETTINGS, orderInQuiz: i },
      }))}
    >
      {/* The dashboard's full-width <main>: muted, padded, the scroll container. */}
      <div className="flex h-screen flex-col">
        <main className="flex-1 overflow-y-auto bg-muted p-4 sm:p-6 lg:p-8">
          <QuizOverview
            flow={flow}
            register={form.register}
            watch={form.watch}
            setValue={form.setValue}
            clearErrors={form.clearErrors}
            errors={form.formState.errors}
            queryData={{ categories, difficulties, languages }}
            canPublish
            unspecifiedFields={[]}
            editingQuestionId={editing}
            onEditingQuestionChange={setEditing}
            detailsOpen={detailsOpen}
            onDetailsOpenChange={setDetailsOpen}
            submitCount={form.formState.submitCount}
            formId="story-quiz"
            reviewBack={
              flow === "ai" ? { onDiscard: () => {}, costsAGeneration: true } : undefined
            }
            submitButton={
              <LiftedButton type="button" size="sm" className="flex items-center gap-1.5">
                Publish quiz
                <ArrowRight className="h-4 w-4" />
              </LiftedButton>
            }
          />
        </main>
      </div>
    </QuizQuestionProvider>
  );
};

/**
 * Providers: the entity selects in "Edit details" read the user through React Query, and the
 * question editors use the router — docs/development/storybook.md §6.
 */
const meta = {
  title: "Dashboard/Quiz/QuizOverview",
  component: Harness,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, enabled: false } },
      });
      return (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Story />
          </MemoryRouter>
        </QueryClientProvider>
      );
    },
  ],
  args: { flow: "ai", seed: questions },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

/** AI review: the answers start hidden, and Reveal shows one question's answer. */
export const AiReview: Story = {
  play: async ({ canvasElement }) => {
    // Clear the remembered switch so the flow's default is what's under test.
    window.localStorage.removeItem("oq:quiz-overview:show-answers:ai");
    const canvas = within(canvasElement);
    const first = canvas.getByRole("article", { name: "Question 1" });

    await expect(within(first).queryByText("(correct answer)")).toBeNull();
    await userEvent.click(within(first).getByRole("button", { name: "Reveal answer" }));
    await expect(within(first).getByText("(correct answer)")).toBeInTheDocument();

    // Only that card: the second question still keeps its answer back.
    const second = canvas.getByRole("article", { name: "Question 2" });
    await expect(within(second).queryByText("(correct answer)")).toBeNull();
  },
};

/** Building by hand: you wrote the answers, so they show from the start. */
export const Building: Story = {
  args: { flow: "build" },
  play: async ({ canvasElement }) => {
    window.localStorage.removeItem("oq:quiz-overview:show-answers:build");
    const first = within(canvasElement).getByRole("article", { name: "Question 1" });
    await expect(within(first).getByText("(correct answer)")).toBeInTheDocument();
  },
};

/** Edit opens that question in the dialog, and Next moves to the following one. */
export const EditingAQuestion: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const second = canvas.getByRole("article", { name: "Question 2" });
    await userEvent.click(within(second).getByRole("button", { name: "Edit question 2" }));

    // The dialog is portalled to <body>, outside the canvas.
    const body = within(document.body);
    await expect(await body.findByRole("dialog")).toBeInTheDocument();
    await expect(body.getByText("Question 2")).toBeInTheDocument();
    await userEvent.click(body.getByRole("button", { name: "Next" }));
    await expect(await body.findByText("Question 3")).toBeInTheDocument();
  },
};

/** Remove takes the question out, and Undo puts it back where it was. */
export const RemoveAndUndo: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Remove question 2" }));
    // Gone once its exit animation has played.
    await waitFor(() =>
      expect(canvas.queryByText(/The SAT is a standardised test/)).toBeNull(),
    );

    await userEvent.click(await canvas.findByRole("button", { name: "Undo" }));
    // Back, and back in second place.
    const second = await canvas.findByRole("article", { name: "Question 2" });
    await expect(within(second).getByText(/The SAT is a standardised test/)).toBeInTheDocument();
  },
};

/** The grip moves a question with the arrow keys too — the keyboard way to drag. */
export const ReorderWithKeyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByRole("button", { name: "Drag to reorder question 1" }).focus();
    await userEvent.keyboard("{ArrowDown}");
    const second = canvas.getByRole("article", { name: "Question 2" });
    await expect(within(second).getByText(/most commonly refer to/)).toBeInTheDocument();
  },
};

export const Empty: Story = { args: { seed: [] } };
