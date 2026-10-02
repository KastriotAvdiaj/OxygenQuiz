import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Shuffle, Users } from "lucide-react";
import { Button, Card, Spinner } from "@/components/ui";
import { Input, Label } from "@/components/ui/form";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { LiftedButton } from "@/common/LiftedButton";
import { cn } from "@/utils/cn";
import { rule } from "@/lib/filtering";
import { useSearchQuizzes } from "@/pages/Dashboard/Pages/Quiz/api/search-quizzes";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import { useClasses } from "../api/classes";
import { HOSTED_LIMITS, useStartHostedGame } from "../api/hosted-games";
import { TEAM_THEME } from "./hosted-model";
import { freshTeams, moveStudent, resizeTeams, setupProblem, shuffle, toStartInput, type Clocks, type DraftTeam } from "./setup-model";

/**
 * `/my-dashboard/host` — setting up Host mode (docs/quiz/classroom.md): pick a Board (or arrive with
 * `?quizId=` from a board's start dialog), split the class into 2–4 Teams, choose the clocks, Start.
 */
export const HostSetupPage = () => {
  const [params, setParams] = useSearchParams();
  const quizId = Number(params.get("quizId")) || null;

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Host a board</h1>
        <p className="mt-1 text-muted-foreground">
          Play an Associations board with your class on one screen. You make the moves; the teams take turns.
        </p>
      </div>
      {quizId ? (
        <Setup quizId={quizId} shareToken={params.get("shareToken")} onChangeBoard={() => setParams({})} />
      ) : (
        <BoardPicker onPick={(id) => setParams({ quizId: String(id) })} />
      )}
    </div>
  );
};

const boardsQuery = (search: string) => ({
  pageSize: 12,
  search: search || undefined,
  filters: [rule.eq("format", "Associations")],
});

const BoardPicker = ({ onPick }: { onPick: (quizId: number) => void }) => {
  const [search, setSearch] = useState("");
  const mine = useSearchQuizzes({ scope: "mine", query: boardsQuery(search) });
  const others = useSearchQuizzes({ scope: "public", query: boardsQuery(search) });

  const list = (title: string, items: QuizSummaryDTO[] | undefined, loading: boolean, empty: string) => (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      {loading ? (
        <Spinner />
      ) : !items?.length ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((quiz) => (
            <button
              key={quiz.id}
              type="button"
              onClick={() => onPick(quiz.id)}
              className="rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
            >
              <span className="block truncate font-semibold">{quiz.title}</span>
              <span className="text-xs text-muted-foreground">
                {quiz.category} · {quiz.status}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <Card className="space-y-5 p-5">
      <Input variant="minimal" placeholder="Search boards" value={search} onChange={(e) => setSearch(e.target.value)} />
      {list("Your boards", mine.data?.items, mine.isLoading, "You haven't made a board yet — your drafts can be hosted too.")}
      {list("Public boards", others.data?.items, others.isLoading, "No public boards match.")}
    </Card>
  );
};

const Setup = ({ quizId, shareToken, onChangeBoard }: { quizId: number; shareToken: string | null; onChangeBoard: () => void }) => {
  const navigate = useNavigate();
  const classes = useClasses();
  const start = useStartHostedGame();
  const [classId, setClassId] = useState<number | null>(null);
  const [teams, setTeams] = useState<DraftTeam[]>(() => freshTeams(2));
  const [clocks, setClocks] = useState<Clocks>({ timed: false });
  const [dragging, setDragging] = useState<{ from: number; index: number } | null>(null);

  const roster = classes.data?.find((c) => c.id === classId) ?? null;
  const problem = setupProblem(teams, clocks);

  const pickClass = (id: number | null) => {
    setClassId(id);
    const students = classes.data?.find((c) => c.id === id)?.students ?? [];
    setTeams((current) => shuffle(current.map((t) => ({ ...t, students: [] })), students));
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start.mutate(toStartInput(quizId, shareToken, teams, clocks), {
          onSuccess: (view) => navigate(`/host/${view.id}`),
        });
      }}
    >
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm">
          Board <span className="font-semibold">#{quizId}</span> — its title isn&apos;t shown while you play.
        </p>
        <Button type="button" size="sm" variant="ghost" onClick={onChangeBoard}>
          Choose another board
        </Button>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="host-class">Class</Label>
            <select
              id="host-class"
              className="block h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={classId ?? ""}
              onChange={(e) => pickClass(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">No class — just team names</option>
              {classes.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.students.length})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Teams</Label>
            <SegmentedControl
              aria-label="Number of teams"
              value={String(teams.length)}
              onValueChange={(v) => setTeams((current) => resizeTeams(current, Number(v)))}
              options={["2", "3", "4"].map((n) => ({ value: n, label: n }))}
            />
          </div>
          {roster && roster.students.length > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={() => setTeams((t) => shuffle(t, roster.students))}>
              <Shuffle className="mr-1 h-4 w-4" /> Shuffle into teams
            </Button>
          )}
        </div>

        <div className={cn("grid gap-3", teams.length > 2 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2")}>
          {teams.map((team, seat) => (
            <div
              key={seat}
              onDragOver={(e) => dragging && e.preventDefault()}
              onDrop={() => {
                if (dragging) setTeams((t) => moveStudent(t, dragging.from, dragging.index, seat));
                setDragging(null);
              }}
              className={cn("space-y-2 rounded-lg border-2 p-3", TEAM_THEME[team.colour].active.split(" ")[0], TEAM_THEME[team.colour].soft)}
            >
              <Input
                variant="minimal"
                aria-label={`Team ${seat + 1} name`}
                maxLength={HOSTED_LIMITS.teamName}
                value={team.name}
                onChange={(e) => setTeams((t) => t.map((x, i) => (i === seat ? { ...x, name: e.target.value } : x)))}
              />
              {team.students.length === 0 ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> No names — that&apos;s fine.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {team.students.map((student, index) => (
                    <li
                      key={`${student}-${index}`}
                      draggable
                      onDragStart={() => setDragging({ from: seat, index })}
                      className="inline-flex cursor-grab items-center gap-1 rounded-full border border-border bg-background py-0.5 pl-2.5 pr-1 text-sm"
                    >
                      {student}
                      {/* Drag works with a mouse; this works everywhere else. */}
                      <select
                        aria-label={`Move ${student} to another team`}
                        className="h-6 w-5 cursor-pointer appearance-none rounded bg-transparent text-center text-xs text-muted-foreground"
                        value={seat}
                        onChange={(e) => setTeams((t) => moveStudent(t, seat, index, Number(e.target.value)))}
                      >
                        {teams.map((other, i) => (
                          <option key={i} value={i}>
                            {i === seat ? "⇄" : `→ ${other.name || `Team ${i + 1}`}`}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <SegmentedControl
          aria-label="Time limit"
          value={clocks.timed ? "timed" : "none"}
          onValueChange={(v) => setClocks(v === "timed" ? { timed: true, minutes: 20, turnSeconds: 60 } : { timed: false })}
          options={[
            { value: "none", label: "No time limit" },
            { value: "timed", label: "Timed" },
          ]}
        />
        {clocks.timed ? (
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="host-minutes">Game time (minutes)</Label>
              <Input
                id="host-minutes"
                type="number"
                variant="minimal"
                min={HOSTED_LIMITS.minGameMinutes}
                max={HOSTED_LIMITS.maxGameMinutes}
                value={clocks.minutes}
                onChange={(e) => setClocks({ ...clocks, minutes: Number(e.target.value) })}
                className="w-28"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Each turn</Label>
              <SegmentedControl
                aria-label="Turn time"
                value={String(clocks.turnSeconds)}
                onValueChange={(v) => setClocks({ ...clocks, turnSeconds: Number(v) })}
                options={HOSTED_LIMITS.turnSeconds.map((s) => ({ value: String(s), label: `${s}s` }))}
              />
            </div>
            <p className="basis-full text-xs text-muted-foreground">
              A turn that runs out passes to the next team. When the game time is up, the round is finished so every team has had as many turns.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">You set the pace in class. You can pause at any time either way.</p>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {problem && <p className="text-sm text-destructive">{problem}</p>}
        <LiftedButton type="submit" disabled={!!problem} isPending={start.isPending}>
          Start
        </LiftedButton>
      </div>
    </form>
  );
};
