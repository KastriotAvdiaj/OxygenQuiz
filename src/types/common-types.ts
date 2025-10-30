// types/common.types.ts

export type BaseEntity<TId = number> = {
  id: TId;
  concurrencyStamp: string;
};

export type Entity<T, TId = number> = {
  [K in keyof T]: T[K];
} & BaseEntity<TId>;

export interface Pagination {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination?: Pagination;
}

export type DashboardViewMode = "my" | "admin";

export interface DashboardPaginatedResponse<T> extends PaginatedResponse<T> {
  mode: DashboardViewMode;
}