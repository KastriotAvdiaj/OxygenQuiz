import type { Meta, StoryObj } from "@storybook/react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./data-table";
import { Badge } from "./badge";

/**
 * The shared dashboard table — Quiz Management, Users Dashboard, My Quizzes, and the
 * category / difficulty / language lookups all render this one component.
 *
 * Here mainly to review the row treatment: `bg-primary/10` alternating with `bg-muted`,
 * borrowing the Questions page's card tint but only on every other row. Tinting *every* row
 * (two steps of the wash) was the first attempt and read as a wall of blue on these pages,
 * where the table is the only thing on screen.
 *
 * Flip the **Theme** toolbar toggle when reviewing — the tint is alpha over the surface
 * beneath, so light and dark are genuinely different renderings, and striping that reads
 * well in one can flatten out in the other. The header stays neutral (`bg-muted`) and is
 * separated by a 1px divider; check that divider runs at an even weight all the way across,
 * which is what the removal of `position: relative` on header cells fixed.
 *
 * It renders every row it is handed and owns no pagination; `PaginationControls` is the
 * pager (see docs/quiz/filtering.md).
 */

interface QuizRow {
  title: string;
  createdAt: string;
  author: string;
  category: string;
  difficulty: string;
  status: "Public" | "Draft";
  questions: number;
}

/**
 * Priorities mirror the real quiz table (see that file for the reasoning): identity and
 * status always render, the two you scan by appear when there is room, the rest are detail.
 * They are what `NarrowViewport` below exercises.
 */
const columns: ColumnDef<QuizRow, any>[] = [
  { accessorKey: "title", header: "Quiz Info", meta: { priority: 1 } },
  { accessorKey: "createdAt", header: "Date Created", meta: { priority: 2 } },
  { accessorKey: "author", header: "Author", meta: { priority: 2 } },
  { accessorKey: "category", header: "Category", meta: { priority: 3 } },
  { accessorKey: "difficulty", header: "Difficulty", meta: { priority: 3 } },
  { accessorKey: "questions", header: "Questions", meta: { priority: 3 } },
  {
    accessorKey: "status",
    header: "Status",
    meta: { priority: 1 },
    // A badge column on purpose: both dashboards put one on a tinted row (Status here,
    // active/inactive on Users), and it has to stay legible on either stripe.
    cell: ({ row }) => (
      <Badge variant={row.original.status === "Public" ? "default" : "secondary"}>
        {row.original.status}
      </Badge>
    ),
  },
];

const quizzes: QuizRow[] = [
  { title: "Software Development Concepts", createdAt: "June 17, 2026", author: "admin", category: "Programming", difficulty: "Medium", status: "Public", questions: 6 },
  { title: "Developer Knowledge Check", createdAt: "June 17, 2026", author: "admin", category: "Programming", difficulty: "Medium", status: "Public", questions: 10 },
  { title: "Programming Fundamentals", createdAt: "June 17, 2026", author: "admin", category: "Programming", difficulty: "Easy", status: "Public", questions: 4 },
  { title: "Web Development Basics", createdAt: "June 17, 2026", author: "admin", category: "Programming", difficulty: "Unspecified", status: "Public", questions: 3 },
  { title: "Wars & Leaders", createdAt: "June 16, 2026", author: "admin", category: "History", difficulty: "Easy", status: "Public", questions: 5 },
  { title: "Nature of Things", createdAt: "June 16, 2026", author: "admin", category: "Science", difficulty: "Hard", status: "Public", questions: 6 },
  { title: "Web & Beyond", createdAt: "June 16, 2026", author: "admin", category: "Technology", difficulty: "Hard", status: "Draft", questions: 6 },
];

/**
 * `DataTable` is generic, so the meta has to name a concrete row type — a bare
 * `Meta<typeof DataTable>` resolves `TData` to `unknown` and then no typed `columns` array
 * is assignable to it.
 */
const meta = {
  title: "UI/DataTable",
  component: DataTable,
  parameters: { layout: "padded" },
  args: { columns, data: quizzes },
} satisfies Meta<typeof DataTable<QuizRow>>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A full page of rows, as Quiz Management renders it. */
export const Default: Story = {};

/** Two rows — the smallest case where the alternation still has to be visible. */
export const TwoRows: Story = {
  args: { data: quizzes.slice(0, 2) },
};

/** A single row gets the darker step, with no stripe to compare it against. */
export const SingleRow: Story = {
  args: { data: quizzes.slice(0, 1) },
};

/** The empty state fills the row with `muted` so it doesn't read as a broken table. */
export const Empty: Story = {
  args: { data: [] },
};

/**
 * A narrow viewport, which is now a column-priority story rather than a scrolling one.
 *
 * The table measures **its own container**, so this one drops to the priority-1 columns —
 * Quiz Info and Status — and grows a chevron at the start of each row; everything else
 * moves into the detail panel behind it. Expand a row and check that the tint behind the
 * detail matches the row it belongs to, that the `<dt>` labels read as the headers they
 * replaced, and that the Status badge is still legible on either stripe.
 *
 * Resize the canvas to watch the tiers come back: Date Created and Author return at 620px,
 * the rest at 960px, at which point the chevron column disappears entirely.
 *
 * It measures the container and not the window on purpose — see
 * docs/adr/0010-a-narrow-table-drops-columns-it-does-not-scroll.md — so dragging the
 * Storybook canvas is a real test of the behaviour, not an approximation of it.
 */
export const NarrowViewport: Story = {
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
