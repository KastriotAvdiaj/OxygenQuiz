import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { QuizSelectionDialogView } from "./quiz-selection-dialog-view";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import type {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/question-types";

const makeQuiz = (overrides: Partial<QuizSummaryDTO>): QuizSummaryDTO => ({
  id: 1,
  title: "Chemistry Basics",
  category: "Science",
  difficulty: "Medium",
  language: "English",
  gradient: true,
  colorPaletteJson: JSON.stringify(["#6366f1"]),
  timeLimitInSeconds: 20,
  status: "Public",
  createdAt: new Date().toISOString(),
  questionCount: 12,
  user: "Ada",
  ...overrides,
});

const quizzes: QuizSummaryDTO[] = [
  makeQuiz({ id: 1, title: "Chemistry Basics", category: "Science", questionCount: 12 }),
  makeQuiz({
    id: 2,
    title: "World Capitals",
    category: "Geography",
    user: "Linus",
    questionCount: 20,
    colorPaletteJson: JSON.stringify(["#10b981"]),
  }),
  makeQuiz({
    id: 3,
    title: "Movie Trivia Night",
    category: "Entertainment",
    user: "Grace",
    questionCount: 15,
    timeLimitInSeconds: 15,
    colorPaletteJson: JSON.stringify(["#f59e0b"]),
  }),
];

const categories: QuestionCategory[] = [
  { id: 1, name: "Science", username: "Ada", colorPaletteJson: "[]", gradient: false, createdAt: "" },
  { id: 2, name: "Geography", username: "Ada", colorPaletteJson: "[]", gradient: false, createdAt: "" },
];

const difficulties: QuestionDifficulty[] = [
  { id: 1, level: "Easy", username: "Ada", weight: 1, createdAt: "" },
  { id: 2, level: "Medium", username: "Ada", weight: 2, createdAt: "" },
];

const languages: QuestionLanguage[] = [
  { id: 1, language: "English", username: "Ada", createdAt: "" },
];

const meta = {
  title: "Quiz/Multiplayer/Lobby/QuizSelectionDialog",
  component: QuizSelectionDialogView,
  parameters: { layout: "fullscreen" },
  args: {
    isOpen: true,
    selectedQuiz: null,
    searchQuery: "",
    resultCount: quizzes.length,
    filtersOpen: false,
    facetCount: 0,
    categories,
    difficulties,
    languages,
    selections: { categoryIds: [], difficultyIds: [], languageIds: [] },
    isLoading: false,
    quizzes,
    onClose: fn(),
    onSearchChange: fn(),
    onClearFilters: fn(),
    onFiltersOpenChange: fn(),
    onToggleFacet: fn(),
    onClearFacets: fn(),
    onSelectQuiz: fn(),
    onPageChange: fn(),
  },
} satisfies Meta<typeof QuizSelectionDialogView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Browsing: Story = {};

export const NothingSelectedYet: Story = {
  args: { quizzes, selectedQuiz: null },
};

export const QuizSelected: Story = {
  args: { selectedQuiz: { id: "2", title: "World Capitals" } },
};

export const Loading: Story = {
  args: { isLoading: true, quizzes: [] },
};

export const NoResults: Story = {
  args: {
    quizzes: [],
    resultCount: 0,
    searchQuery: "asdkjasd",
  },
};

export const NoResultsWithActiveFacets: Story = {
  args: {
    quizzes: [],
    resultCount: 0,
    facetCount: 2,
    selections: { categoryIds: [1], difficultyIds: [2], languageIds: [] },
  },
};

export const FiltersOpen: Story = {
  args: {
    filtersOpen: true,
    facetCount: 1,
    selections: { categoryIds: [1], difficultyIds: [], languageIds: [] },
  },
};

export const Paginated: Story = {
  args: {
    resultCount: 36,
    pagination: {
      currentPage: 2,
      itemsPerPage: 12,
      totalItems: 36,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    },
  },
};
