import type { FilterQuery, FilterRule, FilterValue, SortRule } from "./types";

// Ergonomic builders for filter rules, so callers write
//   rule.between("createdAt", from, to)
// instead of hand-assembling the object. Each returns a FilterRule.
export const rule = {
  eq: (field: string, value: FilterValue): FilterRule => ({ field, operator: "eq", values: [value] }),
  neq: (field: string, value: FilterValue): FilterRule => ({ field, operator: "neq", values: [value] }),
  contains: (field: string, value: string): FilterRule => ({ field, operator: "contains", values: [value] }),
  startsWith: (field: string, value: string): FilterRule => ({ field, operator: "startsWith", values: [value] }),
  gt: (field: string, value: FilterValue): FilterRule => ({ field, operator: "gt", values: [value] }),
  gte: (field: string, value: FilterValue): FilterRule => ({ field, operator: "gte", values: [value] }),
  lt: (field: string, value: FilterValue): FilterRule => ({ field, operator: "lt", values: [value] }),
  lte: (field: string, value: FilterValue): FilterRule => ({ field, operator: "lte", values: [value] }),
  in: (field: string, values: FilterValue[]): FilterRule => ({ field, operator: "in", values }),
  between: (field: string, from: FilterValue, to: FilterValue): FilterRule => ({
    field,
    operator: "between",
    values: [from, to],
  }),
};

export const sortBy = (field: string, direction: SortRule["direction"] = "asc"): SortRule => ({
  field,
  direction,
});

// Drops rules with no values so optional UI filters can be passed through unconditionally.
const isUsable = (r: FilterRule) => r.values.length > 0 && r.values.every((v) => v !== "" && v != null);

/**
 * Serializes a FilterQuery to URLSearchParams matching the backend wire format:
 *   page, pageSize, search,
 *   sort=field:dir,field2:dir2
 *   filter=field:op:value[,value2]   (repeated, one per rule)
 */
export function buildFilterParams(query: FilterQuery): URLSearchParams {
  const params = new URLSearchParams();

  if (query.page != null) params.set("page", String(query.page));
  if (query.pageSize != null) params.set("pageSize", String(query.pageSize));
  if (query.search?.trim()) params.set("search", query.search.trim());

  if (query.sort?.length) {
    params.set("sort", query.sort.map((s) => `${s.field}:${s.direction}`).join(","));
  }

  if (query.includeDeleted) params.set("includeDeleted", "true");

  for (const r of query.filters ?? []) {
    if (!isUsable(r)) continue;
    params.append("filter", `${r.field}:${r.operator}:${r.values.map(String).join(",")}`);
  }

  return params;
}

export const buildFilterQueryString = (query: FilterQuery): string => {
  const qs = buildFilterParams(query).toString();
  return qs ? `?${qs}` : "";
};
