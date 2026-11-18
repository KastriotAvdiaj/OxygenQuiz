import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { fn } from "@storybook/test";

import type { QuickPlayTile } from "./quick-play-model";
import { QuickPlayView } from "./quick-play-view";

const levels = [
  { id: 1, label: "Easy", count: 6 },
  { id: 2, label: "Medium", count: 4 },
  { id: 3, label: "Hard", count: 2 },
];
const tiles: QuickPlayTile[] = [
  { id: "any", name: "Surprise me", count: 31, levels },
  { id: 10, name: "General Knowledge", color: "#2563eb", count: 12, levels },
  { id: 11, name: "Geography", color: "#16a34a", count: 8, levels: levels.slice(0, 2) },
  { id: 12, name: "History", color: "#b45309", count: 6, levels },
  { id: 13, name: "Science", color: "#7c3aed", count: 4, levels: levels.slice(0, 1) },
  { id: 14, name: "Film & TV", color: "#fde047", count: 1, levels: levels.slice(2) },
];

/** `/quick-play` — docs/quiz/quick-play.md. Two steps on one signpost: a category, then how hard. */
const meta = {
  title: "Quiz/QuickPlayView",
  component: QuickPlayView,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="flex min-h-screen flex-col">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  args: {
    tiles,
    selectedId: null,
    onSelect: fn(),
    onPlay: fn(),
    onPlayAgain: fn(),
    onRetryLoad: fn(),
  },
} satisfies Meta<typeof QuickPlayView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Step one: one board per category on the post. Check it in light (dusk) and dark (night). */
export const Categories: Story = {};

/** A long post: twelve categories. The post grows, the hill stays under its foot. */
export const ManyCategories: Story = {
  args: {
    tiles: [
      ...tiles,
      ...["Music", "Art", "Sport", "Food & Drink", "Nature", "Technology"].map((name, i) => ({
        id: 20 + i,
        name,
        color: ["#db2777", "#0891b2", "#ea580c", "#65a30d", "#0d9488", "#4f46e5"][i],
        count: 3,
        levels,
      })),
    ],
  },
};

/** Step two, in the category's colour. */
export const HowHard: Story = { args: { selectedId: 12 } };

/** A category with one difficulty: nothing to choose, so only the one button. */
export const OneDifficulty: Story = { args: { selectedId: 13 } };

export const FetchingAQuiz: Story = { args: { selectedId: 12, pending: 2 } };

/** The player has had every quiz for the choice: said, never silently repeated. */
export const PlayedThemAll: Story = { args: { selectedId: 11, exhausted: true } };

export const NothingYet: Story = { args: { tiles: [] } };

export const CouldNotLoad: Story = { args: { tiles: [], loadFailed: true } };
