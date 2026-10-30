import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";

/**
 * Placeholders for the dashboard list pages (Quizzes, Questions) while their own data loads.
 *
 * Each one is drawn in the shape of what replaces it — same row count as the page size, same
 * rough proportions — so the swap to real content doesn't move anything else on the page. They
 * replaced a full-height `BlobLoader` that hid the whole page (header included) until three
 * lookup lists had loaded. See docs/development/loading-states.md §2.1 and ADR 0029.
 */

/** The quizzes table: a header bar, then `rows` rows of title + meta + status + ⋯. */
export const TableSkeleton = ({ rows = 10 }: { rows?: number }) => (
  <SkeletonGroup label="Loading quizzes" className="overflow-hidden rounded-lg shadow-md">
    <div className="flex items-center gap-4 border-b border-foreground/10 px-4 py-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="ml-auto hidden h-4 w-20 sm:block" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-12" />
    </div>
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="flex items-center gap-4 border-b border-foreground/5 px-4 py-3 last:border-b-0">
        <div className="min-w-0 flex-1 space-y-2">
          {/* Varying widths: a column of identical bars reads as a pattern, not as text. */}
          <Skeleton className={i % 3 === 0 ? "h-4 w-2/3" : i % 3 === 1 ? "h-4 w-1/2" : "h-4 w-3/5"} />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="hidden h-4 w-20 sm:block" />
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    ))}
  </SkeletonGroup>
);

/** The question cards list: `count` cards of a title line, two option rows and a footer. */
export const QuestionListSkeleton = ({ count = 6 }: { count?: number }) => (
  <SkeletonGroup label="Loading questions" className="space-y-4">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="space-y-3 rounded-lg border p-4 dark:border-foreground/20">
        <Skeleton className={i % 2 === 0 ? "h-4 w-3/4" : "h-4 w-2/3"} />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-7" />
          <Skeleton className="h-7" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    ))}
  </SkeletonGroup>
);

/** The filter sidebar: a search box, then a few labelled groups of chips. */
export const FilterPanelSkeleton = () => (
  <SkeletonGroup label="Loading filters" className="space-y-6 rounded-lg border bg-card p-4 dark:border-foreground/30">
    <Skeleton className="h-10 w-full" />
    {[4, 5, 3].map((chips, group) => (
      <div key={group} className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: chips }, (_, i) => (
            <Skeleton key={i} className={i % 2 === 0 ? "h-7 w-20 rounded-full" : "h-7 w-16 rounded-full"} />
          ))}
        </div>
      </div>
    ))}
  </SkeletonGroup>
);
