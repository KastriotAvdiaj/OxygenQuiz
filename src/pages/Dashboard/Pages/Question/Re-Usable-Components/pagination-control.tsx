import { Button } from "@/components/ui/button";
import { Pagination as PaginationType } from "@/types/ApiTypes"; // Adjust path
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  pagination: PaginationType | undefined;
  onPageChange: (pageNumber: number) => void;
}

export const PaginationControls = ({ pagination, onPageChange }: PaginationControlsProps) => {
  if (!pagination || pagination.totalPages <= 1) {
    return null; // Don't render if no pagination needed
  }

  const { currentPage, totalPages, hasPreviousPage, hasNextPage } = pagination;

  return (
    <div className="flex items-center justify-between mt-6 py-3">
      <Button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPreviousPage}
        variant="outline"
        size="sm"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage}
        variant="outline"
        size="sm"
      >
        Next
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
};