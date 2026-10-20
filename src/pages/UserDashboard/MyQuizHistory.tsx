import { useState } from "react";
import { Card, BlobLoader } from "@/components/ui";
import { useUser } from "@/lib/Auth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  QuizHistoryEmpty,
  QuizHistoryFilterButton,
  QuizHistoryResults,
  QuizHistoryToolbar,
  useQuizHistory,
} from "@/pages/UserRelated/Profile/components/QuizHistoryList";
import { QuizHistoryFilterPanel } from "@/pages/UserRelated/Profile/components/quiz-history-filters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MultiplayerHistory } from "./multiplayer-history";

/**
 * Two tabs, because the two kinds of play are different lists (decided 2026-10-11;
 * docs/quiz/user-stats-history.md § "Two tabs"). A single-player session is a row with a score, a
 * duration and a status, and is searched and filtered like one. A lobby is several matches against
 * the same people and has none of those as a single value — so it gets its own rows, one per
 * lobby, and its matches are left out of the first tab rather than listed twice.
 */
type HistoryTab = "single" | "multiplayer";
const HISTORY_TABS: { value: HistoryTab; label: string }[] = [
  { value: "single", label: "Single player" },
  { value: "multiplayer", label: "Multiplayer" },
];

/**
 * `/my-dashboard/history` — the signed-in user's full play history.
 *
 * This is the destination for the "View quiz history" button in the account overlay's Quiz
 * Stats panel. The split is deliberate: the overlay is something you glance at and dismiss,
 * so it holds the aggregate numbers only, while history is a list you scroll, paginate and
 * click into — a workspace task, and the dashboard is the workspace.
 *
 * The page uses the same shell as My Quizzes and My Questions — title row, the table in a
 * `Card`, filters (search included) in a sticky sidebar from `lg` up and in a sheet below it —
 * so the three dashboard lists read as one set. The pieces inside are the
 * profile's (`useQuizHistory` and friends in QuizHistoryList.tsx); only the arrangement differs.
 * Rows link to the existing results page, which already renders the per-question review.
 */
export const MyQuizHistory = () => {
  const { data: user } = useUser();

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      {/* The route is behind `userAuthLoader`, so an absent user here means the profile
          request is still in flight rather than a signed-out visitor. */}
      {user?.id ? (
        <HistoryPage userId={user.id} />
      ) : (
        <div className="flex justify-center items-center py-16">
          <BlobLoader size="md" />
        </div>
      )}
    </div>
  );
};

/**
 * One header and one `Tabs` for both tabs, so switching only swaps what is under the tabs. Each
 * tab used to render its own header and its own tab control: the multiplayer one had lost the
 * description line, and because the control was remounted on every switch its pill had nothing
 * to slide from. The single-player history state lives here too, so its filters and page survive
 * a trip to the other tab.
 */
const HistoryPage = ({ userId }: { userId: string }) => {
  const [tab, setTab] = useState<HistoryTab>("single");
  // Matches are the other tab's, listed by lobby — so this list leaves them out.
  const history = useQuizHistory(userId, { singlePlayerOnly: true });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filterPanel = (
    <QuizHistoryFilterPanel
      lookups={history.lookups}
      state={history.filters}
      showSearch
      className="bg-background"
    />
  );

  return (
    <>
      <div className="flex justify-between items-center gap-4 mb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Quiz History</h1>
          <p className="text-sm text-muted-foreground">
            Every quiz you've played. Select one to review your answers.
          </p>
        </div>
        {tab === "single" && !history.hasNoPlays && (
          <QuizHistoryFilterButton
            className="lg:hidden"
            count={history.filters.activeCount}
            onClick={() => setFiltersOpen(true)}
          />
        )}
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as HistoryTab)}>
        <TabsList aria-label="Which plays to list" className="mb-6">
          {HISTORY_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="single" className="mt-0">
          {history.hasNoPlays ? (
            <Card className="p-6 bg-card border dark:border-foreground/30">
              <QuizHistoryEmpty />
            </Card>
          ) : (
            <div className="flex gap-6 items-start">
              <div className="flex-1 min-w-0">
                <Card className="p-6 bg-card border dark:border-foreground/30 space-y-4">
                  <QuizHistoryToolbar history={history} showSearch={false} />
                  <QuizHistoryResults history={history} tone="primary" />
                </Card>
              </div>

              {/* Same sticky sidebar as My Quizzes. */}
              <aside className="hidden lg:block w-80 xl:w-[350px] shrink-0 sticky top-6 self-start max-h-[calc(100vh-3rem)] overflow-y-auto pl-1">
                {filterPanel}
              </aside>
            </div>
          )}
        </TabsContent>

        <TabsContent value="multiplayer" className="mt-0">
          <Card className="p-6 bg-card border dark:border-foreground/30 space-y-4">
            <MultiplayerHistory userId={userId} />
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="w-[350px] sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          {filterPanel}
        </SheetContent>
      </Sheet>
    </>
  );
};
