import { useEffect, useState } from "react";
import { Card, Spinner, Button } from "@/components/ui";
import { RefreshCw, Filter } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import formatDate from "@/lib/date-format";
import { PaginationControls } from "@/components/ui/pagination-control";
import { pagedResponseToPagination } from "@/lib/pagination-query";
import { rule, type FilterQuery, type FilterRule } from "@/lib/filtering";
import { useSearchAuditLogs } from "./api/search-audit-logs";
import { useUserData } from "@/pages/Dashboard/Pages/User/api/get-users";
import { useDebounce } from "@/hooks/use-debounce";
import { type AuditLog as AuditLogEntry } from "@/types/audit-types";
import { AuditLogFilters } from "./components/audit-log-filters";

const PAGE_SIZE = 25;

// Colour the action chip by intent: destructive (red), additive (green), else neutral.
const actionTone = (action: string) => {
  if (/Deleted|Failed/.test(action)) return "text-red-500 border-red-500/30";
  if (/Created|SignedUp|LoggedIn/.test(action))
    return "text-green-600 border-green-600/30";
  return "text-muted-foreground";
};

// Show the most informative snapshot, truncated; full value on hover.
const details = (row: AuditLogEntry) => {
  const raw = row.newValue ?? row.oldValue;
  if (!raw) return "—";
  return (
    <span className="font-mono text-xs text-muted-foreground" title={raw}>
      {raw.length > 60 ? `${raw.slice(0, 60)}…` : raw}
    </span>
  );
};

const shortId = (id: string | null) => (id ? `${id.slice(0, 8)}…` : "system");

export const AuditLog = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [actions, setActions] = useState<string[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  const [actorIds, setActorIds] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const usersQuery = useUserData({});
  const users = usersQuery.data ?? [];
  const usernameOf = (id: string) =>
    users.find((u) => u.id === id)?.username ?? `${id.slice(0, 8)}…`;

  const filters: FilterRule[] = [];
  if (actions.length) filters.push(rule.in("action", actions));
  if (entities.length) filters.push(rule.in("entity", entities));
  if (actorIds.length) filters.push(rule.in("userId", actorIds));
  if (from && to) filters.push(rule.between("createdAt", from, to));
  else if (from) filters.push(rule.gte("createdAt", from));
  else if (to) filters.push(rule.lte("createdAt", to));

  const query: FilterQuery = {
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearchTerm || undefined,
    filters,
  };

  const { data, isLoading, isError, refetch, isFetching } = useSearchAuditLogs({ query });

  // Reset to the first page whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, actions, entities, actorIds, from, to]);

  const activeFilterCount =
    actions.length + entities.length + actorIds.length +
    (from ? 1 : 0) + (to ? 1 : 0);

  const filterPanelProps = {
    searchTerm,
    onSearchTermChange: setSearchTerm,
    actions,
    onActionsChange: setActions,
    entities,
    onEntitiesChange: setEntities,
    users: users.map((u) => ({ id: u.id, username: u.username })),
    actorIds,
    onActorIdsChange: setActorIds,
    from,
    to,
    onFromChange: setFrom,
    onToChange: setTo,
  };

  const rows = data?.items ?? [];

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      {/* ── Page header ── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground mt-1">
            A record of important actions across the app. Read-only.
          </p>
        </div>
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
          <Button
            onClick={() => refetch()}
            disabled={isFetching}
            className="shrink-0 px-3 py-2 text-sm">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Content + Sidebar layout ── */}
      <div className="flex gap-6 items-start">
        {/* Table card */}
        <div className="flex-1 min-w-0">
          <Card className="p-6 bg-card border dark:border-foreground/30">
            {isLoading ? (
              <div className="flex justify-center items-center py-16">
                <Spinner size="lg" />
              </div>
            ) : isError ? (
              <p className="text-center text-red-500 py-8">
                Failed to load the audit log. Please try again later.
              </p>
            ) : rows.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                No audit entries match these filters.
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(row.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={actionTone(row.action)}>
                            {row.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.entity ? (
                            <span>
                              {row.entity}
                              {row.entityId && (
                                <span className="text-muted-foreground"> #{row.entityId}</span>
                              )}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell
                          className="font-mono text-xs text-muted-foreground"
                          title={row.userId ?? "system / anonymous"}>
                          {row.userId ? usernameOf(row.userId) : shortId(row.userId)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.ipAddress ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-[18rem] truncate">
                          {details(row)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Separator className="my-6" />

                <PaginationControls
                  pagination={data ? pagedResponseToPagination(data) : undefined}
                  onPageChange={(newPage) => {
                    setPage(newPage);
                    window.scrollTo(0, 0);
                  }}
                />
              </>
            )}
          </Card>
        </div>

        {/* Sticky scrollable sidebar for desktop */}
        <aside className="hidden lg:block w-80 xl:w-[350px] shrink-0 sticky top-6 self-start max-h-[calc(100vh-3rem)] overflow-y-auto pl-1">
          <AuditLogFilters {...filterPanelProps} />
        </aside>
      </div>

      {/* Mobile drawer */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="w-[350px] sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <AuditLogFilters {...filterPanelProps} />
        </SheetContent>
      </Sheet>
    </div>
  );
};
