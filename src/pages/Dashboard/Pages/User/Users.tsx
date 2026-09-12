import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { LiftedButton } from "@/common/LiftedButton";
import { columns } from "./Components/columns";
import { DataTable } from "@/components/ui/data-table";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Filter } from "lucide-react";
import { UserControls } from "./Components/user-page-button-group";
import { UserFilters } from "./Components/user-filters";
import { PaginationControls } from "@/components/ui/pagination-control";
import { useSearchUsers } from "./api/search-users";
import { useDebounce } from "@/hooks/use-debounce";
import { rule, type FilterQuery, type FilterRule } from "@/lib/filtering";
import { pagedResponseToPagination } from "@/lib/pagination-query";
import type { TriState } from "@/components/ui/tri-state-select";

export const Users = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [roles, setRoles] = useState<string[]>([]);
  const [registeredFrom, setRegisteredFrom] = useState("");
  const [registeredTo, setRegisteredTo] = useState("");
  const [lastLoginFrom, setLastLoginFrom] = useState("");
  const [lastLoginTo, setLastLoginTo] = useState("");
  const [deleted, setDeleted] = useState<TriState>("any");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const pageSize = 20;

  const filters: FilterRule[] = [];
  if (roles.length) filters.push(rule.in("role", roles));
  if (deleted !== "any") filters.push(rule.eq("isDeleted", deleted === "yes"));
  if (registeredFrom && registeredTo) filters.push(rule.between("dateRegistered", registeredFrom, registeredTo));
  else if (registeredFrom) filters.push(rule.gte("dateRegistered", registeredFrom));
  else if (registeredTo) filters.push(rule.lte("dateRegistered", registeredTo));
  if (lastLoginFrom && lastLoginTo) filters.push(rule.between("lastLogin", lastLoginFrom, lastLoginTo));
  else if (lastLoginFrom) filters.push(rule.gte("lastLogin", lastLoginFrom));
  else if (lastLoginTo) filters.push(rule.lte("lastLogin", lastLoginTo));

  const query: FilterQuery = {
    page,
    pageSize,
    search: debouncedSearchTerm || undefined,
    filters,
  };

  const usersQuery = useSearchUsers({ query });

  // Reset to the first page whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, roles, registeredFrom, registeredTo, lastLoginFrom, lastLoginTo, deleted]);

  const activeFilterCount =
    roles.length +
    (deleted !== "any" ? 1 : 0) +
    (registeredFrom ? 1 : 0) + (registeredTo ? 1 : 0) +
    (lastLoginFrom ? 1 : 0) + (lastLoginTo ? 1 : 0);

  const filterPanelProps = {
    searchTerm,
    onSearchTermChange: setSearchTerm,
    roles,
    onRolesChange: setRoles,
    registeredFrom,
    registeredTo,
    onRegisteredFromChange: setRegisteredFrom,
    onRegisteredToChange: setRegisteredTo,
    lastLoginFrom,
    lastLoginTo,
    onLastLoginFromChange: setLastLoginFrom,
    onLastLoginToChange: setLastLoginTo,
    deleted,
    onDeletedChange: setDeleted,
  };

  const users = usersQuery.data?.items ?? [];

  return (
    // `p-6` is gone: DashboardLayout's `main` owns the page gutter, and the two stacked on a
    // phone. `py-4 sm:py-8` is the same density step applied vertically — see Quizzes.tsx.
    <div className="container mx-auto py-4 sm:py-8">
      {/* ── Page header ──
          Title and its actions get a row each on phones, one shared row from `sm`. The
          Filters trigger used to live in the card header, below the title and above the
          table; it belongs with the page's other actions, the same as on the quiz and
          question pages. The h1 is display type and scales with width; the button is a
          control and deliberately does not (docs/RESPONSIVE.md). */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">Users Dashboard</h1>
        <div className="flex items-center gap-2">
          {/* Same lifted treatment as the Questions and Quizzes pages — see the note in
              Questions.tsx for why `lg:hidden` sits on `outerClassName` (the front FACE is
              what `className` styles, so hiding it there would leave the button's own box
              and its shadow layers still taking a row) and what `liftColor` controls.

              No `text-*` here, deliberately: this has to stand exactly as tall as the
              "Create User" button beside it, and both faces are `py-2` around one line of
              text, so the height is decided entirely by the font-size. */}
          <LiftedButton
            outerClassName="w-fit lg:hidden"
            className="gap-2 bg-background font-medium text-foreground"
            liftColor="muted"
            onClick={() => setFiltersOpen(true)}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </LiftedButton>
          {/* The page's create action lives in the page header on all three dashboard
              list pages, not inside the card — the card holds the table and nothing else.
              See docs/RESPONSIVE.md, "Dashboard list pages: one header, one card". */}
          <UserControls />
        </div>
      </div>

      {/* ── Content + Sidebar layout ── */}
      <div className="flex gap-6 items-start">
        {/* Table card */}
        <div className="flex-1 min-w-0">
          {/* Card padding is a gutter too — 24px each side inside a page that already
              indents is 48px of a phone spent on nothing. See Questions.tsx. */}
          <Card className="p-4 sm:p-6 bg-card border dark:border-foreground/30">
            {usersQuery.isError ? (
              <p className="text-center text-red-500 py-8">
                Failed to load users. Please try again later.
              </p>
            ) : usersQuery.isLoading ? (
              <div className="flex justify-center items-center py-16">
                <Spinner size="lg" />
              </div>
            ) : (
              <>
                <DataTable data={users} columns={columns} />
                <div className="mt-6">
                  <PaginationControls
                    pagination={
                      usersQuery.data
                        ? pagedResponseToPagination(usersQuery.data)
                        : undefined
                    }
                    onPageChange={(newPage) => {
                      setPage(newPage);
                      window.scrollTo(0, 0);
                    }}
                  />
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Sticky scrollable sidebar for desktop */}
        <aside className="hidden lg:block w-80 xl:w-[350px] shrink-0 sticky top-6 self-start max-h-[calc(100vh-3rem)] overflow-y-auto pl-1">
          <UserFilters {...filterPanelProps} />
        </aside>
      </div>

      {/* Mobile drawer */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="w-[350px] sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <UserFilters {...filterPanelProps} />
        </SheetContent>
      </Sheet>
    </div>
  );
};
