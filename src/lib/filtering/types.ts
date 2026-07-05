// Shared filtering types — the frontend mirror of QuizAPI.Filtering on the backend.
// One model used by every filtered list endpoint (see docs/quiz/filtering.md).

export type FilterOperator =
  | "eq"
  | "neq"
  | "contains"
  | "startsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "between";

export type FilterValue = string | number | boolean;

export type FilterRule = {
  field: string;
  operator: FilterOperator;
  values: FilterValue[];
};

export type SortDirection = "asc" | "desc";

export type SortRule = {
  field: string;
  direction: SortDirection;
};

// The query a filtered endpoint accepts. Serialized to the query string by
// buildFilterParams; the backend binds it as a FilterQuery.
export type FilterQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: SortRule[];
  filters?: FilterRule[];
  // Admin-only: also return soft-deleted rows (the quiz all/search endpoint honours this).
  includeDeleted?: boolean;
};

// The standard body envelope every filtered endpoint returns.
export type PagedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};
