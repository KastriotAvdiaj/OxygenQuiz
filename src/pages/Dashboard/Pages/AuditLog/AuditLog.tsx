import { useEffect, useState } from "react";
import { Card, Spinner, Button } from "@/components/ui";
import { RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import formatDate from "@/lib/date-format";
import { PaginationControls } from "@/pages/Dashboard/Pages/Question/Components/Re-Usable-Components/pagination-control";
import { useAuditLogsData } from "./api/get-audit-logs";
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITIES,
  type AuditLog as AuditLogEntry,
} from "@/types/audit-types";
import { LiftedButton } from "@/common/LiftedButton";

const ALL = "all";
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

const shortId = (id: string | null) =>
  id ? `${id.slice(0, 8)}…` : "system";

export const AuditLog = () => {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<string>(ALL);
  const [entity, setEntity] = useState<string>(ALL);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const params = {
    page,
    pageSize: PAGE_SIZE,
    action: action === ALL ? undefined : action,
    entity: entity === ALL ? undefined : entity,
    from: from || undefined,
    to: to || undefined,
  };

  const { data, isLoading, isError, refetch, isFetching } = useAuditLogsData({
    params,
  });

  // Reset to the first page whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [action, entity, from, to]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo(0, 0);
  };

  const rows = data?.items ?? [];

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground mt-1">
            A record of important actions across the app. Read-only.
          </p>
        </div>
        <LiftedButton
          onClick={() => refetch()}
          disabled={isFetching}
          className="shrink-0 px-3 py-2 text-sm">
          <RefreshCw
            className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </LiftedButton>
      </div>

      <Card className="p-6 bg-card border dark:border-foreground/30">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">Action</label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All actions</SelectItem>
                {AUDIT_ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">Entity</label>
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All entities</SelectItem>
                {AUDIT_ENTITIES.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <Separator className="my-6" />

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
                      <Badge
                        variant="outline"
                        className={actionTone(row.action)}>
                        {row.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.entity ? (
                        <span>
                          {row.entity}
                          {row.entityId && (
                            <span className="text-muted-foreground">
                              {" "}
                              #{row.entityId}
                            </span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell
                      className="font-mono text-xs text-muted-foreground"
                      title={row.userId ?? "system / anonymous"}>
                      {shortId(row.userId)}
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

            <div className="mt-6">
              <PaginationControls
                pagination={data?.pagination}
                onPageChange={handlePageChange}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
