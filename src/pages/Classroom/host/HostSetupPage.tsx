import { useState, type CSSProperties } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useAnimate, type Variants } from "framer-motion";
import { AlertCircle, ArrowLeftRight, ArrowRight, FolderX, LayoutGrid, Minus, Plus, Shuffle, Users } from "lucide-react";
import { Button, Card, Spinner } from "@/components/ui";
import { Input, Label } from "@/components/ui/form";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LiftedButton } from "@/common/LiftedButton";
import { cn } from "@/utils/cn";
import { useDebounce } from "@/hooks/use-debounce";
import { Separator } from "@/components/ui/separator";
import { parseQuizPalette, quizEdgeColor, readableTextColor } from "@/pages/Quiz/components/quiz-palette";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { rule } from "@/lib/filtering";
import { useSearchQuizzes } from "@/pages/Dashboard/Pages/Quiz/api/search-quizzes";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import { useClasses } from "../api/classes";
import { DEFAULT_TEAM_NAMES, HOSTED_LIMITS, useStartHostedGame } from "../api/hosted-games";
import { TEAM_THEME } from "./hosted-model";
import { emptyTeamSeats, freshTeams, maxTeamsFor, moveStudent, resizeTeams, setupProblem, shuffle, toStartInput, type Clocks, type DraftTeam } from "./setup-model";

/** The class picker's "no class" option. Radix Select can't use "" as an item value. */
const NO_CLASS = "none";

/** The game-time stepper's step. The range itself is the API's (`HOSTED_LIMITS`). */
const MINUTE_STEP = 5;

const clampMinutes = (minutes: number) =>
  Number.isFinite(minutes)
    ? Math.min(HOSTED_LIMITS.maxGameMinutes, Math.max(HOSTED_LIMITS.minGameMinutes, Math.round(minutes)))
    : HOSTED_LIMITS.minGameMinutes;

/**
 * `/my-dashboard/host` — setting up Host mode (docs/quiz/classroom.md): pick a Board (or arrive with
 * `?quizId=` from a board's start dialog), split the class into 2–4 Teams, choose the clocks, Start.
 */
export const HostSetupPage = () => {
  const [params, setParams] = useSearchParams();
  const quizId = Number(params.get("quizId")) || null;
  const reduceMotion = usePrefersReducedMotion();
  // Forward into Setup, backward out of it.
  const direction = quizId ? 1 : -1;

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Host a board</h1>
      </div>
      {/* Picking a board slides the picker out and Setup in (and back for "Choose another
          board"): a short, one-direction move that says "next step" without a page load's jolt.
          Reduced motion keeps only the fade. */}
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={quizId ? `setup-${quizId}` : "picker"}
          custom={direction}
          variants={reduceMotion ? FADE : STEP}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {quizId ? (
            <Setup quizId={quizId} shareToken={params.get("shareToken")} onChangeBoard={() => setParams({})} />
          ) : (
            <BoardPicker onPick={(id) => setParams({ quizId: String(id) })} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const STEP: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 32 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -32 }),
};
const FADE: Variants = { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } };

const boardsQuery = (search: string) => ({
  pageSize: 12,
  search: search || undefined,
  filters: [rule.eq("format", "Associations")],
});

const BoardPicker = ({ onPick }: { onPick: (quizId: number) => void }) => {
  // Searches as you type, debounced so two lists don't refetch on every keystroke.
  const [draft, setDraft] = useState("");
  const search = useDebounce(draft.trim(), 300);
  const mine = useSearchQuizzes({ scope: "mine", query: boardsQuery(search) });
  const others = useSearchQuizzes({ scope: "public", query: boardsQuery(search) });

  // One section of the picker: a heading, then the boards in a muted well — so both lists live in
  // one card, told apart by the well and a separator rather than by two floating cards.
  const list = (title: string, items: QuizSummaryDTO[] | undefined, loading: boolean, empty: string) => (
    <section className="space-y-2.5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="rounded-xl bg-muted p-2.5 sm:p-3">
        {loading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : !items?.length ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <FolderX className="h-10 w-10 text-muted-foreground/60" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{empty}</p>
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((quiz) => (
              <BoardChoice key={quiz.id} quiz={quiz} onPick={() => onPick(quiz.id)} />
            ))}
          </div>
        )}
      </div>
    </section>
  );

  const searching = search.trim().length > 0;

  return (
    <Card className="space-y-5 p-4 sm:p-5 bg-card border dark:border-foreground/30">
      {/* Search lives in the card it filters: one quiet underline field, no button — it
          searches as you type. */}
      <div role="search" className="w-full sm:w-72">
        <Input
          variant="minimal"
          aria-label="Search boards"
          placeholder="Search boards"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </div>
      {list(
        "Your boards",
        mine.data?.items,
        mine.isLoading,
        searching ? "None of your boards match." : "You don't have any boards yet — drafts can be hosted too.",
      )}
      <Separator />
      {list("Public boards", others.data?.items, others.isLoading, searching ? "No public boards match." : "There are no public boards yet.")}
    </Card>
  );
};

/**
 * One board in the picker. The ModeCard language at list size: a chip in the board's own category
 * colour (its palette's first stop, with the pushable edge `quizEdgeColor` derives — a runtime
 * colour, so inline custom properties, CLAUDE.md), the title, what it's about, and an arrow that
 * travels on hover. A Draft says so: it can be hosted, but nobody else can see it.
 */
const BoardChoice = ({ quiz, onPick }: { quiz: QuizSummaryDTO; onPick: () => void }) => {
  const colour = parseQuizPalette(quiz.colorPaletteJson)[0];
  return (
    <button
      type="button"
      onClick={onPick}
      style={{ "--chip": colour, "--chip-text": readableTextColor(colour), "--edge": quizEdgeColor(colour) } as CSSProperties}
      className="group flex w-full items-center gap-3 rounded-xl border-2 border-transparent bg-card p-3 text-left shadow-sm transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--chip)] text-[color:var(--chip-text)] shadow-[0_3px_0_0_var(--edge)] transition-transform duration-200 group-hover:-rotate-6">
        <LayoutGrid className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{quiz.title}</span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="truncate">
            {quiz.category} · {quiz.difficulty}
          </span>
          {quiz.status === "Draft" && (
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              Draft
            </span>
          )}
        </span>
      </span>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
        aria-hidden="true"
      />
    </button>
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
  const classSize = roster ? roster.students.length : null;
  const problem = setupProblem(teams, clocks, classSize);
  // Empty Teams are shown on their own cards; anything else is said beside Start.
  const emptySeats = emptyTeamSeats(teams, classSize);
  const otherProblem = setupProblem(teams, clocks, classSize, { ignoreEmptyTeams: true });
  // Problems stay quiet until Start is pressed once — a fresh form isn't wrong yet.
  const [attempted, setAttempted] = useState(false);
  const reduceMotion = usePrefersReducedMotion();
  const [teamsScope, animate] = useAnimate<HTMLDivElement>();

  const pickClass = (id: number | null) => {
    setClassId(id);
    const students = classes.data?.find((c) => c.id === id)?.students ?? [];
    // A smaller Class than the current Team count drops the extra Teams before the shuffle, so
    // picking a Class never leaves a Team empty by construction (maxTeamsFor).
    const fit = Math.max(HOSTED_LIMITS.minTeams, maxTeamsFor(id === null ? null : students.length));
    setTeams((current) =>
      shuffle(resizeTeams(current, Math.min(current.length, fit)).map((t) => ({ ...t, students: [] })), students),
    );
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (problem) {
          // Start stays pressable so it can answer "why not?": the empty cards shake where the
          // fix is, rather than a disabled button and a sentence at the far end of the page.
          setAttempted(true);
          if (!reduceMotion && emptySeats.length > 0)
            void animate("[data-empty-team]", { x: [0, -10, 10, -7, 7, -3, 3, 0] }, { duration: 0.45 });
          return;
        }
        start.mutate(toStartInput(quizId, shareToken, teams, clocks), {
          onSuccess: (view) => navigate(`/host/${view.id}`),
        });
      }}
    >
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card border dark:border-foreground/30">
        <p className="text-sm">
          Board <span className="font-semibold">#{quizId}</span> — its title isn&apos;t shown while you play.
        </p>
        <Button type="button" size="sm" variant="ghost" onClick={onChangeBoard}>
          Choose another board
        </Button>
      </Card>

      <Card className="space-y-4 p-5 bg-card border dark:border-foreground/30">
        <div className="flex flex-wrap items-end gap-4">
          {/* flex-col, not space-y: the controls below are inline-flex, and space-y's margin
              doesn't push an inline box onto its own line — "Teams" sat beside its numbers. */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="host-class">Class</Label>
            {/* The app's Select (Radix), in the form look the quiz builder uses. Radix reserves ""
                for "no value", so "No class" needs a sentinel of its own. */}
            <Select
              value={classId === null ? NO_CLASS : String(classId)}
              onValueChange={(v) => pickClass(v === NO_CLASS ? null : Number(v))}
            >
              <SelectTrigger id="host-class" variant="form" className="w-64 max-w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent variant="form">
                <SelectItem variant="form" value={NO_CLASS}>
                  No class — just team names
                </SelectItem>
                {classes.data?.map((c) => (
                  <SelectItem variant="form" key={c.id} value={String(c.id)}>
                    {c.name} ({c.students.length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Teams</Label>
            <SegmentedControl
              aria-label="Number of teams"
              value={String(teams.length)}
              onValueChange={(v) => setTeams((current) => resizeTeams(current, Number(v)))}
              options={["2", "3", "4"].map((n) => ({
                value: n,
                label: n,
                // More Teams than students would leave one empty — see setupProblem.
                disabledReason:
                  classSize !== null && Number(n) > classSize
                    ? `This class has ${classSize} students`
                    : undefined,
              }))}
            />
          </div>
          {roster && roster.students.length > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={() => setTeams((t) => shuffle(t, roster.students))}>
              <Shuffle className="mr-1 h-4 w-4" /> Shuffle into teams
            </Button>
          )}
        </div>

        <div ref={teamsScope} className={cn("grid gap-3", teams.length > 2 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2")}>
          {teams.map((team, seat) => (
            <div
              key={seat}
              data-empty-team={emptySeats.includes(seat) || undefined}
              onDragOver={(e) => dragging && e.preventDefault()}
              onDrop={() => {
                if (dragging) setTeams((t) => moveStudent(t, dragging.from, dragging.index, seat));
                setDragging(null);
              }}
              className={cn("space-y-3 rounded-xl border-2 p-4", TEAM_THEME[team.colour].fill, TEAM_THEME[team.colour].onFill)}
            >
              {/* A solid field on the coloured fill: the name is the one thing to edit here, so
                  it gets the strongest contrast on the card rather than a hairline on colour. */}
              <Input
                aria-label={`Team ${seat + 1} name`}
                // The name an empty field starts with (toStartInput falls back to it), so the
                // placeholder says what the Team will actually be called.
                placeholder={DEFAULT_TEAM_NAMES[seat]}
                className="h-10 w-full rounded-lg border-0 bg-background px-3 text-base font-semibold text-foreground shadow-sm sm:text-base focus-visible:ring-2 focus-visible:ring-background/70 focus-visible:ring-offset-0"
                maxLength={HOSTED_LIMITS.teamName}
                value={team.name}
                onChange={(e) => setTeams((t) => t.map((x, i) => (i === seat ? { ...x, name: e.target.value } : x)))}
              />
              {team.students.length === 0 && classSize !== null ? (
                // With a Class an empty Team can't start. Quiet until Start is pressed, then a
                // solid chip in destructive red — readable on all four fills, the error where the
                // fix is (drop a name on this card).
                attempted ? (
                  <p
                    role="alert"
                    className="inline-flex items-center gap-1.5 rounded-md bg-background px-2 py-1 text-xs font-semibold text-destructive shadow-sm"
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    Needs at least one student — drag a name here
                  </p>
                ) : (
                  <p className="flex items-center gap-1 text-xs opacity-90">
                    <Users className="h-3.5 w-3.5" /> No students yet — drag a name here.
                  </p>
                )
              ) : team.students.length === 0 ? (
                <p className="flex items-center gap-1 text-xs opacity-90">
                  <Users className="h-3.5 w-3.5" /> No names — that&apos;s fine.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {team.students.map((student, index) => (
                    <li
                      key={`${student}-${index}`}
                      draggable
                      onDragStart={() => setDragging({ from: seat, index })}
                      className="inline-flex cursor-grab items-center gap-1 rounded-full bg-background py-0.5 pl-2.5 pr-1 text-sm text-foreground shadow-sm"
                    >
                      {student}
                      {/* Drag works with a mouse; this works everywhere else. With two Teams there is
                          only one place to go, so the button moves the name straight there — a
                          menu with a single row would be a click for nothing. */}
                      {teams.length === 2 ? (
                        <button
                          type="button"
                          aria-label={`Move ${student} to ${teams[1 - seat].name || `Team ${2 - seat}`}`}
                          onClick={() => setTeams((t) => moveStudent(t, seat, index, 1 - seat))}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`Move ${student} to another team`}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </DropdownMenuTrigger>
                        {/* Only the *other* Teams: the old native select listed this one too, as a
                            no-op "⇄" row that existed only to show the current value. */}
                        <DropdownMenuContent align="start">
                          <DropdownMenuLabel className="text-xs text-muted-foreground">Move to</DropdownMenuLabel>
                          {teams.map((other, i) =>
                            i === seat ? null : (
                              <DropdownMenuItem
                                key={i}
                                onSelect={() => setTeams((t) => moveStudent(t, seat, index, i))}
                              >
                                {other.name || `Team ${i + 1}`}
                              </DropdownMenuItem>
                            ),
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 p-5 bg-card border dark:border-foreground/30">
        {/* Top row: the choice, then (when timed) the turn clock beside it. Game time sits under
            them — it's the one value that needs a stepper's room. */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Format</Label>
            <SegmentedControl
              aria-label="Time limit"
              value={clocks.timed ? "timed" : "none"}
              onValueChange={(v) => setClocks(v === "timed" ? { timed: true, minutes: 20, turnSeconds: 60 } : { timed: false })}
              options={[
                { value: "none", label: "No time limit" },
                { value: "timed", label: "Timed" },
              ]}
            />
          </div>
          {clocks.timed && (
            <div className="flex flex-col gap-1.5">
              <Label>Each turn</Label>
              <SegmentedControl
                aria-label="Turn time"
                value={String(clocks.turnSeconds)}
                onValueChange={(v) => setClocks({ ...clocks, turnSeconds: Number(v) })}
                options={HOSTED_LIMITS.turnSeconds.map((s) => ({ value: String(s), label: `${s}s` }))}
              />
            </div>
          )}
        </div>
        {clocks.timed ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="host-minutes">Game time (minutes)</Label>
              {/* − / + like the Host a lobby dialog's player count. The box stays typeable for an
                  odd number; the buttons step by 5 and both clamp to the API's range. */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  onClick={() => setClocks({ ...clocks, minutes: clampMinutes(clocks.minutes - MINUTE_STEP) })}
                  disabled={clocks.minutes <= HOSTED_LIMITS.minGameMinutes}
                  className="h-9 w-9 shrink-0 rounded-full bg-primary text-white hover:bg-primary/80"
                  aria-label="Less game time"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="host-minutes"
                  type="number"
                  variant="minimal"
                  inputMode="numeric"
                  min={HOSTED_LIMITS.minGameMinutes}
                  max={HOSTED_LIMITS.maxGameMinutes}
                  value={clocks.minutes}
                  onChange={(e) => setClocks({ ...clocks, minutes: Number(e.target.value) })}
                  onBlur={() => setClocks({ ...clocks, minutes: clampMinutes(clocks.minutes) })}
                  className="w-16 text-center text-lg font-semibold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={() => setClocks({ ...clocks, minutes: clampMinutes(clocks.minutes + MINUTE_STEP) })}
                  disabled={clocks.minutes >= HOSTED_LIMITS.maxGameMinutes}
                  className="h-9 w-9 shrink-0 rounded-full bg-primary text-white hover:bg-primary/80"
                  aria-label="More game time"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              A turn that runs out passes to the next team. When the game time is up, the round is finished so every team has had as many turns.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">You set the pace in class. You can pause at any time either way.</p>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {attempted && otherProblem && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {otherProblem}
          </p>
        )}
        <LiftedButton type="submit" isPending={start.isPending}>
          <span className="flex items-center gap-1.5">
            Start
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </LiftedButton>
      </div>
    </form>
  );
};
