import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";
import { QueryConfig } from "@/lib/React-query";
import { cleanQueryParams } from "@/lib/pagination-query";
import { Pagination } from "@/types/common-types";
import { AuditLog } from "@/types/audit-types";

export type GetAuditLogsParams = {
  page?: number;
  pageSize?: number;
  action?: string;
  entity?: string;
  userId?: string;
  from?: string; // ISO date
  to?: string; // ISO date
};

export type AuditLogsResult = {
  items: AuditLog[];
  pagination: Pagination;
};

// The audit endpoint returns pagination in the BODY ({ items, total, page, pageSize }),
// unlike the header-based questions/quizzes endpoints. We map it into the shared
// Pagination shape so the existing PaginationControls component works unchanged.
export const getAuditLogs = async (
  params: GetAuditLogsParams
): Promise<AuditLogsResult> => {
  const queryString = new URLSearchParams(cleanQueryParams(params)).toString();
  const result = await api.get(`/auditlogs?${queryString}`);

  const { items, total, page, pageSize } = result.data as {
    items: AuditLog[];
    total: number;
    page: number;
    pageSize: number;
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items,
    pagination: {
      currentPage: page,
      itemsPerPage: pageSize,
      totalItems: total,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    },
  };
};

export const getAuditLogsQueryOptions = (params: GetAuditLogsParams = {}) =>
  queryOptions({
    queryKey: ["auditLogs", params],
    queryFn: () => getAuditLogs(params),
  });

export const useAuditLogsData = ({
  queryConfig,
  params,
}: {
  queryConfig?: QueryConfig<typeof getAuditLogsQueryOptions>;
  params?: GetAuditLogsParams;
}) =>
  useQuery({
    ...getAuditLogsQueryOptions(params),
    ...queryConfig,
  });
