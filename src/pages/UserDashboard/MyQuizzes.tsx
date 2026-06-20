import { useState, useEffect } from "react";
import { DataTable, Card, LoadingWave, Button } from "@/components/ui";
import { Link } from "react-router-dom";
import { quizColumns } from "@/pages/Dashboard/Pages/Quiz/components/Data-Table-Columns/columns";
import { useSearchQuizzes } from "@/pages/Dashboard/Pages/Quiz/api/search-quizzes";
import { rule, type FilterQuery, type FilterRule } from "@/lib/filtering";
import { useDebounce } from "@/hooks/use-debounce";


import { useQuestionCategoryData } from "@/pages/Dashboard/Pages/Question/Entities/Categories/api/get-question-categories";
import { useQuestionDifficultyData } from "@/pages/Dashboard/Pages/Question/Entities/Difficulty/api/get-question-difficulties";
import { useQuestionLanguageData } from "@/pages/Dashboard/Pages/Question/Entities/Language/api/get-question-language";
import { LiftedButton } from "@/common/LiftedButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/form";
import { GrFormNextLink } from "react-icons/gr";
import {
  QuizFiltersPanel,
  type TriState,
} from "@/pages/Dashboard/Pages/Quiz/components/quiz-filters-panel";
import { Filter } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const MyQuizzes = () => {
  // Same filter state as the admin page, minus the author filter (these are the user's own).
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [difficultyIds, setDifficultyIds] = useState<number[]>([]);
  const [languageIds, setLanguageIds] = useState<number[]>([]);
  const [visibilities, setVisibilities] = useState<string[]>([]);
  const [published, setPublished] = useState<TriState>("any");
  const [active, setActive] = useState<TriState>("any");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const categoriesQuery = useQuestionCategoryData({});
  const difficultiesQuery = useQuestionDifficultyData({});
  const languagesQuery = useQuestionLanguageData({});

  const filters: FilterRule[] = [];
  if (categoryIds.length) filters.push(rule.in("categoryId", categoryIds));
  if (difficultyIds.length) filters.push(rule.in("difficultyId", difficultyIds));
  if (languageIds.length) filters.push(rule.in("languageId", languageIds));
  if (visibilities.length) filters.push(rule.in("visibility", visibilities));
  if (published !== "any") filters.push(rule.eq("isPublished", published === "yes"));
  if (active !== "any") filters.push(rule.eq("isActive", active === "yes"));
  if (createdFrom && createdTo) filters.push(rule.between("createdAt", createdFrom, createdTo));
  else if (createdFrom) filters.push(rule.gte("createdAt", createdFrom));
  else if (createdTo) filters.push(rule.lte("createdAt", createdTo));

  const query: FilterQuery = {
    page: pageNumber,
    pageSize,
    search: debouncedSearchTerm || undefined,
    filters,
  };

  // "mine" scope: ownership is enforced server-side (see /quiz/mine/search).
  const quizData = useSearchQuizzes({ scope: "mine", query });

  useEffect(() => {
    setPageNumber(1);
  }, [
    debouncedSearchTerm,
    categoryIds,
    difficultyIds,
    languageIds,
    visibilities,
    published,
    active,
    createdFrom,
    createdTo,
  ]);

  const isFilterDataLoading =
    categoriesQuery.isLoading ||
    difficultiesQuery.isLoading ||
    languagesQuery.isLoading;

  if (isFilterDataLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingWave size="lg" />
      </div>
    );
  }

  const quizzes = quizData.data?.items ?? [];

  const activeFilterCount =
    categoryIds.length +
    difficultyIds.length +
    languageIds.length +
    visibilities.length +
    (published !== "any" ? 1 : 0) +
    (active !== "any" ? 1 : 0) +
    (createdFrom ? 1 : 0) +
    (createdTo ? 1 : 0);

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Quizzes</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 lg:hidden"
            onClick={() => setFiltersOpen(true)}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Dialog>
          <DialogTrigger asChild>
            <LiftedButton>+ Create Quiz</LiftedButton>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                <p className="text-xl">Choose your quiz title</p>
                <p className="text-muted-foreground text-xs">
                  (You can still change later)
                </p>
              </DialogTitle>
            </DialogHeader>
            <Input variant="quiz" placeholder="Quiz Title" />
            <section className="flex flex-col items-end mt-6">
              <Link to="/my-dashboard/quizzes/create" className="w-fit">
                <LiftedButton className="w-fit">
                  Next
                  <GrFormNextLink />
                </LiftedButton>
              </Link>
            </section>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* ── Content + Sidebar layout ── */}
      <div className="flex gap-6 items-start">
        {/* Table card */}
        <div className="flex-1 min-w-0">
          <Card className="p-6 bg-card border dark:border-foreground/30">
            {quizData.isError ? (
              <p className="text-center text-red-500 py-8">
                Failed to load quizzes. Please try again later.
              </p>
            ) : quizData.isLoading ? (
              <div className="flex justify-center items-center py-16">
                <LoadingWave size="md" />
              </div>
            ) : (
              <DataTable data={quizzes} columns={quizColumns} />
            )}
          </Card>
        </div>

        {/* Sticky scrollable sidebar for desktop */}
        <aside className="hidden lg:block w-80 xl:w-[350px] shrink-0 sticky top-6 self-start max-h-[calc(100vh-3rem)] overflow-y-auto pl-1">
          <QuizFiltersPanel
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            categories={categoriesQuery.data || []}
            selectedCategoryIds={categoryIds}
            onCategoryIdsChange={setCategoryIds}
            difficulties={difficultiesQuery.data || []}
            selectedDifficultyIds={difficultyIds}
            onDifficultyIdsChange={setDifficultyIds}
            languages={languagesQuery.data || []}
            selectedLanguageIds={languageIds}
            onLanguageIdsChange={setLanguageIds}
            selectedVisibilities={visibilities}
            onVisibilitiesChange={setVisibilities}
            published={published}
            onPublishedChange={setPublished}
            active={active}
            onActiveChange={setActive}
            createdFrom={createdFrom}
            createdTo={createdTo}
            onCreatedFromChange={setCreatedFrom}
            onCreatedToChange={setCreatedTo}
          />
        </aside>
      </div>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="w-[350px] sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <QuizFiltersPanel
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            categories={categoriesQuery.data || []}
            selectedCategoryIds={categoryIds}
            onCategoryIdsChange={setCategoryIds}
            difficulties={difficultiesQuery.data || []}
            selectedDifficultyIds={difficultyIds}
            onDifficultyIdsChange={setDifficultyIds}
            languages={languagesQuery.data || []}
            selectedLanguageIds={languageIds}
            onLanguageIdsChange={setLanguageIds}
            selectedVisibilities={visibilities}
            onVisibilitiesChange={setVisibilities}
            published={published}
            onPublishedChange={setPublished}
            active={active}
            onActiveChange={setActive}
            createdFrom={createdFrom}
            createdTo={createdTo}
            onCreatedFromChange={setCreatedFrom}
            onCreatedToChange={setCreatedTo}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
};
