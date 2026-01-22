import { Button } from "@/components/ui/button";
import { Pagination as PaginationType } from "@/types/common-types";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/utils/cn";

/**
 * PaginationControls Component
 * 
 * A reusable pagination component that renders:
 * - Navigation buttons (First, Previous, Next, Last)
 * - Numeric page buttons with intelligent truncation (dots)
 * - Current page indication
 * 
 * Logic:
 * - Shows a range of page numbers around the current page (determined by siblingCount)
 * - Always shows first and last pages
 * - Truncates gaps with "..."
 * - Hides "First" and "Last" buttons if total pages are small (<= 3)
 * 
 * Props:
 * @param pagination - Object containing pagination state (currentPage, totalPages, etc.)
 * @param onPageChange - Callback function when a page is selected
 * @param className - Optional additional classes
 * @param siblingCount - Number of pages to show on each side of the current page (default: 1)
 */

interface PaginationControlsProps {
  pagination: PaginationType | undefined;
  onPageChange: (pageNumber: number) => void;
  className?: string;
  siblingCount?: number;
}

export const PaginationControls = ({
  pagination,
  onPageChange,
  className,
  siblingCount = 1,
}: PaginationControlsProps) => {
  if (!pagination || pagination.totalPages <= 1) {
    return null;
  }

  const { currentPage, totalPages, hasPreviousPage, hasNextPage } = pagination;

  const paginationRange = useMemo(() => {
    const totalPageNumbers = siblingCount + 5;

    if (totalPageNumbers >= totalPages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, "DOTS", lastPageIndex];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + i + 1
      );
      return [firstPageIndex, "DOTS", ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [firstPageIndex, "DOTS", ...middleRange, "DOTS", lastPageIndex];
    }
    return [];
  }, [currentPage, totalPages, siblingCount]);

  // Hide "First" and "Last" buttons if total pages are small
  const showSkipButtons = totalPages > 3;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-6",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {/* First Page Button */}
        {showSkipButtons && (
          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 hidden sm:flex disabled:opacity-30 border shadow-sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            aria-label="Go to first page"
          >
            <ChevronsLeft className="h-5 w-5" />
          </Button>
        )}
        
        {/* Previous Page Button */}
        <Button
          variant="secondary" 
          size="icon"
          className="h-10 w-10 disabled:opacity-30 border shadow-sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1 mx-2">
          {paginationRange.map((pageNumber, idx) => {
            if (pageNumber === "DOTS") {
              return (
                <div
                  key={`dots-${idx}`}
                  className="flex items-center justify-center h-10 w-10 text-muted-foreground"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </div>
              );
            }

            return (
              <Button
                key={pageNumber}
                variant={pageNumber === currentPage ? "default" : "outline"}
                size="icon"
                className={cn(
                  "h-10 w-10 transition-all", 
                  pageNumber === currentPage ? "font-bold shadow-md" : "hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => onPageChange(pageNumber as number)}
                aria-current={pageNumber === currentPage ? "page" : undefined}
              >
                {pageNumber}
              </Button>
            );
          })}
        </div>

        {/* Next Page Button */}
        <Button
          variant="secondary"
          size="icon"
          className="h-10 w-10 disabled:opacity-30 border shadow-sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          aria-label="Go to next page"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        {/* Last Page Button */}
        {showSkipButtons && (
          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 hidden sm:flex disabled:opacity-30 border shadow-sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            aria-label="Go to last page"
          >
            <ChevronsRight className="h-5 w-5" />
          </Button>
        )}
      </div>
      
      <div className="text-sm text-muted-foreground font-medium">
          Page <span className="text-foreground font-bold">{currentPage}</span> of {totalPages}
      </div>
    </div>
  );
};
