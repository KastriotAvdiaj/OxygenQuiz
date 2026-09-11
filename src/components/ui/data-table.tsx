import * as React from "react";
import {
  type ColumnDef,
  type RowData,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/utils/cn";

/**
 * How badly a column wants to be on screen. See `DataTable` and
 * docs/adr/0010-a-narrow-table-drops-columns-it-does-not-scroll.md.
 *
 * - `1` — identity and the thing you came to check. Never hidden.
 * - `2` — earns its place once there is room; the second thing you'd scan.
 * - `3` — detail. Useful at a desk, fine behind a tap on a phone.
 */
export type ColumnPriority = 1 | 2 | 3;

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** See {@link ColumnPriority}. Omitted means 1 — always visible. */
    priority?: ColumnPriority;
  }
}

/**
 * Container widths at which the next priority tier earns its place. These are measured
 * against the TABLE'S OWN BOX, not the viewport, and that distinction is the whole reason
 * this is a ResizeObserver rather than a `matchMedia` call: on the quiz and question pages
 * a 1024px window holds a 76px nav rail AND a 350px filter sidebar, leaving the table about
 * 550px. A viewport-driven rule would call that "desktop" and hand nine columns to a box
 * half that wide — the exact crushing this feature exists to stop. The same table in a
 * dialog, or in a future two-up layout, gets the right answer for free.
 */
const TIER_2_MIN_WIDTH = 620;
const TIER_3_MIN_WIDTH = 960;

const widthToPriority = (width: number): ColumnPriority =>
  width >= TIER_3_MIN_WIDTH ? 3 : width >= TIER_2_MIN_WIDTH ? 2 : 1;

/**
 * Detail-panel open/close. Short and eased-out: this is a disclosure, not an entrance, and
 * the row under it has to settle before the eye moves on. Anything past ~250ms on a control
 * you might tap ten times in a row starts to feel like waiting.
 */
const DETAIL_TRANSITION = {
  duration: 0.2,
  ease: [0.4, 0, 0.2, 1],
} as const;

/**
 * Watches the element it returns a ref for, and reports the highest column priority that
 * fits in it.
 *
 * Starts at 3 — the full table, today's behaviour — so anything that cannot be measured
 * (jsdom in unit tests, a `display: none` ancestor, a browser with no ResizeObserver)
 * degrades to showing everything rather than to showing one column. A width of 0 is
 * treated as "not measured yet" for the same reason.
 */
const useFittingPriority = () => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [priority, setPriority] = React.useState<ColumnPriority>(3);

  React.useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = (width: number) => {
      if (!width) return;
      setPriority(widthToPriority(width));
    };

    measure(element.clientWidth);

    if (typeof ResizeObserver === "undefined") return;

    // Hiding columns changes the table's content width, never this wrapper's (it is a
    // full-width block), so there is no measure → resize → measure loop to guard against.
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) measure(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, priority };
};

/** `id` if the column def has one, else the accessor key — TanStack's own resolution order. */
const columnId = <TData,>(column: ColumnDef<TData, any>): string | undefined => {
  const withKey = column as { id?: string; accessorKey?: string | number };
  return withKey.id ?? (withKey.accessorKey as string | undefined);
};

/** A header is usually a string; when it is a render function, fall back to the column id. */
const headerLabel = (header: unknown, fallback: string): string =>
  typeof header === "string" ? header : fallback;

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
}

/**
 * Renders every row it is given, and nothing else — **the caller owns pagination.**
 *
 * It used to paginate internally as well (`getPaginationRowModel`, `pageSize: 10`, plus its
 * own Page x of y / Previous / Next footer), which double-paginated every page in this app:
 * the data already arrives as one server page. Two visible consequences, both live until
 * 2026-08-05:
 *
 * - The footer always read "Page 1 of 1" with two dead buttons, sitting right below the
 *   real `PaginationControls` — which correctly hides itself at a single page, so the only
 *   pager users could see was the fake one.
 * - Worse where the server page was larger than 10: `Users.tsx` fetches 20 per page, so
 *   half of every page was hidden behind an inner pager nobody knew was there.
 *
 * Pair this with `PaginationControls` + server paging (see `Quizzes.tsx`, `Users.tsx`). For
 * a small unpaged lookup, rendering all rows is the point.
 *
 * ## Narrow containers drop columns
 *
 * A column carrying `meta: { priority: 2 | 3 }` is hidden while the table's own box is too
 * narrow to hold it, and its value moves into a per-row detail panel behind a chevron. A
 * column with no `priority` is treated as 1 and always renders, so every table that has not
 * opted in behaves exactly as it did before this existed.
 *
 * The panel opens on a framer-motion height animation — see the comment at the detail row
 * for why the animated element is a `<div>` inside the cell and not the row itself.
 *
 * The alternative — let it overflow and scroll sideways — is what used to happen here, and
 * the reasons it is not the answer are in
 * docs/adr/0010-a-narrow-table-drops-columns-it-does-not-scroll.md. The short version:
 * `quizColumns` has nine columns, the horizontal scrollbar sits at the bottom edge of a box
 * ten rows tall (so it is below the fold exactly when you need it), and nothing is pinned,
 * so by the time you have dragged across to Status you no longer know whose row you are on.
 *
 * The table is still inside a scrollable wrapper — `Table` brings its own `overflow-auto` —
 * which stays as the backstop for a container narrower than even the priority-1 columns.
 * That wrapper is also why this component no longer adds an `overflow-x-auto` of its own:
 * two nested scrollers meant the inner one clipped first and the outer never fired.
 */
export function DataTable<TData>({ columns, data }: DataTableProps<TData>) {
  const { ref: fitRef, priority: fittingPriority } = useFittingPriority();
  const [expandedRows, setExpandedRows] = React.useState<Record<string, boolean>>(
    {}
  );
  // Honoured rather than ignored: an expanding panel is decoration, and this is a table
  // someone may open ten rows of in a row. `useReducedMotion` tracks the OS setting live.
  const prefersReducedMotion = useReducedMotion();

  const columnVisibility = React.useMemo<VisibilityState>(() => {
    const visibility: VisibilityState = {};
    for (const column of columns) {
      const id = columnId(column);
      if (!id) continue;
      // No priority means priority 1: opting in is explicit, opting out is the default.
      const priority = column.meta?.priority ?? 1;
      visibility[id] = priority <= fittingPriority;
    }
    return visibility;
  }, [columns, fittingPriority]);

  const table = useReactTable({
    data,
    columns,
    state: { columnVisibility },
    getCoreRowModel: getCoreRowModel(),
  });

  const hasHiddenColumns = table
    .getAllColumns()
    .some((column) => !column.getIsVisible());

  const toggleRow = (rowId: string) =>
    setExpandedRows((previous) => ({ ...previous, [rowId]: !previous[rowId] }));

  // Visible columns plus the expander, when there is one — so a detail row and the empty
  // state both span exactly the width of the header above them.
  const detailColSpan =
    table.getVisibleLeafColumns().length + (hasHiddenColumns ? 1 : 0);

  return (
    <div className="w-full" ref={fitRef}>
      <div className="rounded-lg bg-muted shadow-md overflow-hidden">
        <Table className="w-full">
          {/* Header stays neutral — the primary tint belongs to the rows. */}
          <TableHeader className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-foreground-lighter/50 hover:bg-transparent"
              >
                {hasHiddenColumns && (
                  <TableHead className="w-10 px-2 py-4">
                    <span className="sr-only">Row details</span>
                  </TableHead>
                )}
                {headerGroup.headers.map((header) => (
                  // No `relative` here. The cells used to get `position: relative` for
                  // every column except the first, and in a border-collapse table a
                  // positioned cell paints its own background *over* the row's collapsed
                  // border — so the header divider showed up crisp under the first column
                  // and washed out under all the others. Nothing in a header cell is
                  // absolutely positioned, so the positioning was vestigial; dropping it
                  // lets the row's border paint uniformly across the width.
                  <TableHead
                    key={header.id}
                    className="px-4 py-4 text-left text-sm font-semibold text-foreground-lighter/70 tracking-wider"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, i) => {
                // Alternates the primary wash with plain `muted` rather than tinting
                // every row. Two tinted steps (the first attempt) turned a page whose
                // only content is the table into a wall of blue — the Questions page
                // gets away with `bg-primary/10` on its cards because they sit spaced
                // out on a neutral background, not stacked edge to edge.
                // The tint leads, so row 1 separates from the neutral header.
                const stripe = i % 2 === 0 ? "bg-primary/10" : "bg-muted";
                const isExpanded = Boolean(expandedRows[row.id]);
                const hiddenCells = hasHiddenColumns
                  ? row
                      .getAllCells()
                      .filter((cell) => !cell.column.getIsVisible())
                  : [];

                return (
                  <React.Fragment key={row.id}>
                    <TableRow
                      className={cn(
                        "border-none transition-colors duration-200",
                        stripe,
                        // Neutral hover: it has to be visible on both the tinted and the
                        // muted stripe, which a primary hover can't manage against
                        // `bg-primary/10`.
                        "hover:bg-foreground/10"
                      )}
                    >
                      {hasHiddenColumns && (
                        <TableCell className="w-10 px-2 py-4 align-top">
                          <button
                            type="button"
                            onClick={() => toggleRow(row.id)}
                            aria-expanded={isExpanded}
                            aria-label={
                              isExpanded
                                ? "Hide the rest of this row"
                                : "Show the rest of this row"
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <ChevronDown
                              aria-hidden="true"
                              className={cn(
                                "h-4 w-4 transition-transform duration-200 motion-reduce:transition-none",
                                isExpanded && "rotate-180"
                              )}
                            />
                          </button>
                        </TableCell>
                      )}
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={`px-4 py-4 text-sm relative ${
                            cell.column.id === "actions" ? "text-center" : ""
                          }`}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* The hidden columns, as label/value pairs on the row they belong to.
                        The panel's CONTENTS are mounted only while open, so a cell whose
                        renderer holds state or a dialog is never mounted twice for the same
                        row — but the `<tr>`/`<td>` around them stay put, and that is what
                        makes the animation possible. A table row is the one element you
                        cannot animate the height of: `<tr>` and `<td>` ignore `overflow`,
                        so there is nothing to clip a collapsing child against, and browsers
                        disagree about what a height on a row even means. Animate a plain
                        `<div>` INSIDE the cell instead, and let the row be sized by it.

                        That also means the collapsed state has to be genuinely 0px: the
                        padding lives on the inner `<dl>`, not on the cell, or every table
                        would carry a strip of dead space under every row. */}
                    {hiddenCells.length > 0 && (
                      <TableRow
                        className={cn("border-none hover:bg-transparent", stripe)}
                      >
                        <TableCell colSpan={detailColSpan} className="p-0 text-sm">
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                key="detail"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={
                                  prefersReducedMotion
                                    ? { duration: 0 }
                                    : DETAIL_TRANSITION
                                }
                                // Load-bearing: `height: auto` is measured and animated as a
                                // real pixel value, so without clipping the content spills
                                // out of the shrinking box on the way closed.
                                className="overflow-hidden"
                              >
                                <dl className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-x-4 gap-y-2 border-t border-foreground/10 px-4 pb-4 pt-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
                                  {hiddenCells.map((cell) => (
                                    <React.Fragment key={cell.id}>
                                      <dt className="text-foreground-lighter/70">
                                        {headerLabel(
                                          cell.column.columnDef.header,
                                          cell.column.id
                                        )}
                                      </dt>
                                      <dd className="min-w-0">
                                        {flexRender(
                                          cell.column.columnDef.cell,
                                          cell.getContext()
                                        )}
                                      </dd>
                                    </React.Fragment>
                                  ))}
                                </dl>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <TableRow className="border-none bg-muted hover:bg-transparent">
                <TableCell
                  colSpan={detailColSpan}
                  className="h-24 text-center text-text-lighter"
                >
                  No data found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
