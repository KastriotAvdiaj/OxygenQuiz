import React, { useState, KeyboardEvent } from "react";
import { SearchIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { cn } from "@/utils/cn";

interface SearchInputProps {
  placeholder?: string;
  onSearch: (searchTerm: string) => void;
  /** Applied to the row wrapper. The component adds no margin of its own — space it here. */
  className?: string;
  disabled?: boolean;
  initialValue?: string;
}

/**
 * The search row in every dashboard filter panel (users, quizzes, questions, categories,
 * audit log): a field plus an explicit search button. Searching is deliberate — Enter or
 * the button — because the panels feed server-side queries rather than filtering in place.
 *
 * Layout: `w-full` row, field is `flex-1 min-w-0`, button `shrink-0`. It used to be two
 * nested shrink-to-fit flex boxes, so the field sized to its content and left the row
 * half empty however wide the panel got — `.minimal-input`'s own `width: 100%` resolved
 * against that shrink-wrapped parent, not the row.
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = "Search...",
  onSearch,
  className,
  disabled = false,
  initialValue = "",
}) => {
  const [searchTerm, setSearchTerm] = useState<string>(initialValue);

  const handleSearch = () => {
    if (!disabled) {
      onSearch(searchTerm);
    }
  };

  const handleClear = () => {
    setSearchTerm("");
    onSearch("");
  };

  // onKeyDown, not the deprecated onKeyPress (which never fires for non-printable keys in
  // some engines and is removed from React's roadmap).
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className={cn("flex w-full items-center gap-2", className)}>
      {/* min-w-0: without it the flex item refuses to shrink below its content width and a
          long placeholder pushes the button off the panel. */}
      <div className="relative min-w-0 flex-1">
        <Input
          placeholder={placeholder}
          variant="minimal"
          // Slimmer padding + 14px text from `sm` up; see .minimal-input--compact in
          // global.css for why this is a CSS class and not Tailwind utilities.
          className={cn(
            "minimal-input--compact",
            searchTerm && "minimal-input--has-clear"
          )}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          // Labels the phone keyboard's action key "search" instead of "return"
          // (docs/RESPONSIVE.md) — the key still does nothing without onKeyDown above.
          enterKeyHint="search"
          aria-label={placeholder}
        />

        {searchTerm && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            disabled={disabled}
            aria-label="Clear search"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 justify-center rounded-md bg-transparent text-foreground shadow-none hover:bg-transparent hover:text-red-500"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* A plain Button, not LiftedButton: the lifted style's 4px bottom edge and hover
          travel read as a primary page action, which is too much next to a filter field —
          and its extra height made the row look misaligned. */}
      <Button
        type="button"
        size="icon"
        onClick={handleSearch}
        disabled={disabled}
        aria-label="Search"
        className="shrink-0 rounded-md"
      >
        <SearchIcon className="h-4 w-4" />
      </Button>
    </div>
  );
};
