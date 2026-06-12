import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui";
import { columns } from "./Components/columns";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Filter } from "lucide-react";
import { StatsCards } from "./Components/stats-cards";
import { UserControls } from "./Components/user-page-button-group";
import { UserFilters } from "./Components/user-filters";
import { DataTransferControls } from "@/components/data-transfer/DataTransferControls";
import { PaginationControls } from "@/pages/Dashboard/Pages/Question/Components/Re-Usable-Components/pagination-control";
import { useSearchUsers } from "./api/search-users";
import { useDebounce } from "@/hooks/use-debounce";
import { rule, type FilterQuery, type FilterRule } from "@/lib/filtering";
import { pagedResponseToPagination } from "@/lib/pagination-query";
import type { TriState } from "@/components/ui/tri-state-select";

export const Users = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
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
    <div className="space-y-4 p-6">

      {/* Content + Sidebar layout */}
      <div className="flex gap-6 items-start">
        {/* Table card */}
        <div className="flex-1 min-w-0">
          <Card className="p-5 bg-background border-none shadow-none rounded-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-2xl font-bold">Users Dashboard</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 lg:hidden"
                  onClick={() => setFiltersOpen(true)}>
                  <Filter className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <UserControls onRefresh={() => usersQuery.refetch()} exportQuery={query} />
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
            </CardContent>
          </Card>
        </div>

        {/* Sticky scrollable sidebar for desktop */}
        <aside className="hidden lg:block w-[350px] shrink-0 sticky top-6 self-start max-h-[calc(100vh-3rem)] overflow-y-auto pl-1">
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
