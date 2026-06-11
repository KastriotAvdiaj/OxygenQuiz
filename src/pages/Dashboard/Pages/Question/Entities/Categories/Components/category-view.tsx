import { useState, useEffect } from "react";
import { DataTable, Spinner, Card } from "@/components/ui";
import CreateQuestionCategoryForm from "./create-question-category";
import { categoryColumns } from "./columns";
import { CategoryFilters } from "./category-filters";
import { useSearchQuestionCategories } from "../api/search-question-categories";
import { useUserData } from "@/pages/Dashboard/Pages/User/api/get-users";
import { PaginationControls } from "@/pages/Dashboard/Pages/Question/Components/Re-Usable-Components/pagination-control";
import { pagedResponseToPagination } from "@/lib/pagination-query";
import { rule, type FilterQuery, type FilterRule } from "@/lib/filtering";
import { useDebounce } from "@/hooks/use-debounce";
import type { TriState } from "@/components/ui/tri-state-select";
import { DataTransferControls } from "@/components/data-transfer/DataTransferControls";

export const CategoryView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const [gradient, setGradient] = useState<TriState>("any");
  const [creatorIds, setCreatorIds] = useState<string[]>([]);
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const usersQuery = useUserData({});
  const users = usersQuery.data ?? [];

  const filters: FilterRule[] = [];
  if (gradient !== "any") filters.push(rule.eq("gradient", gradient === "yes"));
  if (creatorIds.length) filters.push(rule.in("userId", creatorIds));
  if (createdFrom && createdTo) filters.push(rule.between("createdAt", createdFrom, createdTo));
  else if (createdFrom) filters.push(rule.gte("createdAt", createdFrom));
  else if (createdTo) filters.push(rule.lte("createdAt", createdTo));

  const query: FilterQuery = {
    page,
    pageSize,
    search: debouncedSearchTerm || undefined,
    filters,
  };

  const categoriesQuery = useSearchQuestionCategories({ query });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, gradient, creatorIds, createdFrom, createdTo]);

  const categories = categoriesQuery.data?.items ?? [];

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Categories Management</h1>
      </div>

      {/* ── Table + side filter panel ── */}
      <div className="flex flex-col lg:flex-row w-full gap-6 items-start">
        {/* Table card */}
        <div className="flex-1 min-w-0 w-full">
          <Card className="flex flex-col gap-4 p-8 bg-background border border-border">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <CreateQuestionCategoryForm />
              <DataTransferControls entity="categories" invalidateKey={["questionCategories"]} />
            </div>

            {categoriesQuery.isError ? (
              <p className="text-center text-red-500 py-8">Failed to load categories.</p>
            ) : categoriesQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : (
              <>
                <DataTable data={categories} columns={categoryColumns} />
                <PaginationControls
                  pagination={
                    categoriesQuery.data
                      ? pagedResponseToPagination(categoriesQuery.data)
                      : undefined
                  }
                  onPageChange={(newPage) => setPage(newPage)}
                />
              </>
            )}
          </Card>
        </div>

        {/* Filters stand beside the table on wide screens, above-the-fold stacked otherwise */}
        <aside className="w-full lg:w-[350px] shrink-0  lg:top-6 order-first lg:order-none">
          <CategoryFilters
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            gradient={gradient}
            onGradientChange={setGradient}
            users={users.map((u) => ({ id: u.id, username: u.username }))}
            creatorIds={creatorIds}
            onCreatorIdsChange={setCreatorIds}
            createdFrom={createdFrom}
            createdTo={createdTo}
            onCreatedFromChange={setCreatedFrom}
            onCreatedToChange={setCreatedTo}
          />
        </aside>
      </div>
    </>
  );
};
