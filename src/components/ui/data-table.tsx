import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/utils/cn";

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
 */
export function DataTable<TData>({ columns, data }: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full">
      <div className="rounded-lg bg-muted shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full">
            {/* Header stays neutral — the primary tint belongs to the rows. */}
            <TableHeader className="bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-b border-foreground-lighter/50 hover:bg-transparent"
                >
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
                table.getRowModel().rows.map((row, i) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "border-none transition-colors duration-200",
                      // Alternates the primary wash with plain `muted` rather than tinting
                      // every row. Two tinted steps (the first attempt) turned a page whose
                      // only content is the table into a wall of blue — the Questions page
                      // gets away with `bg-primary/10` on its cards because they sit spaced
                      // out on a neutral background, not stacked edge to edge.
                      // The tint leads, so row 1 separates from the neutral header.
                      i % 2 === 0 ? "bg-primary/10" : "bg-muted",
                      // Neutral hover: it has to be visible on both the tinted and the muted
                      // stripe, which a primary hover can't manage against `bg-primary/10`.
                      "hover:bg-foreground/10"
                    )}
                  >
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
                ))
              ) : (
                <TableRow className="border-none bg-muted hover:bg-transparent">
                  <TableCell
                    colSpan={columns.length}
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
    </div>
  );
}
