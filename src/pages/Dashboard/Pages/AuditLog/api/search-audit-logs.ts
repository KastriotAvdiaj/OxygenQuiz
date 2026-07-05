import { queryOptions, useQuery } from "@tanstack/react-query";
import { QueryConfig } from "@/lib/React-query";
import { fetchPaged, type FilterQuery, type PagedResponse } from "@/lib/filtering";
import type { AuditLog } from "@/types/audit-types";

// Audit trail over the shared filtering framework (see docs/quiz/filtering.md). Admin-only.
export const searchAuditLogs = (query: FilterQuery): Promise<PagedResponse<AuditLog>> =>
  fetchPaged<AuditLog>("/auditlogs/search", query);

export const searchAuditLogsQueryOptions = (query: FilterQuery = {}) =>
  queryOptions({
    queryKey: ["auditLogs", "search", query],
    queryFn: () => searchAuditLogs(query),
  });

export const useSearchAuditLogs = ({
  query,
  queryConfig,
}: {
  query?: FilterQuery;
  queryConfig?: QueryConfig<typeof searchAuditLogsQueryOptions>;
} = {}) =>
  useQuery({
    ...searchAuditLogsQueryOptions(query),
    ...queryConfig,
  });
