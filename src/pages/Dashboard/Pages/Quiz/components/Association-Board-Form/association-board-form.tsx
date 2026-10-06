import { useRef, useState, type MutableRefObject } from "react";
import { useLocation, useNavigate } from "react-router";
import type {
  FieldErrors,
  UseFormRegister,
  UseFormReturn,
  UseFormSetValue,
} from "react-hook-form";
import { ArrowLeft, Brain, Info, Plus, X } from "lucide-react";

import { Form, Input, Label, Textarea } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LiftedButton } from "@/common/LiftedButton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNotifications } from "@/common/Notifications";
import { useDraftAutosave } from "@/hooks/use-draft-autosave";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { useUser } from "@/lib/Auth";
import type { StoredDraft } from "@/lib/drafts/draft-storage";
import { COLUMN_LETTERS } from "@/types/association-types";
import type { Quiz, QuizStatus } from "@/types/quiz-types";

import { CategorySelect } from "../../../Question/Entities/Categories/Components/select-question-category";
import { DifficultySelect } from "../../../Question/Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../../../Question/Entities/Language/components/select-question-language";
import { isUnspecifiedLookup } from "../../../Question/Entities/lookup-visibility";
import { useQuizForm } from "../Create-Quiz-Form/use-quiz-form";
import {
  associationQuizFormSchema,
  BOARD_MAX_OTHER_SPELLINGS,
  BOARD_MINUTES,
  emptyAssociationQuizFormValues,
  splitSpellings,
  toAssociationQuizPayload,
  useCreateAssociationQuiz,
  useUpdateAssociationQuiz,
  type AssociationQuizFormValues,
} from "../../api/association-quiz";
import {
  DraftSavedIndicator,
  LeaveUnfinishedQuizDialog,
} from "../draft-notices";
import {
  ASSOCIATION_DRAFT_VERSION,
  QUIZ_DRAFT_SLOTS,
  isAssociationBoardDraftWorthKeeping,
  type AssociationBoardDraft,
} from "../quiz-drafts";

type AssociationBoardFormProps = {
  /** Edit mode: the quiz being edited, and its board already mapped to form values. */
  edit?: { quiz: Quiz; values: AssociationQuizFormValues; version: number };
  /**
   * Create mode: an unfinished board read from storage by `CreateAssociationQuizRoute`, seeded
   * as the form's defaults. Ignored in edit mode.
   */
  restoredDraft?: StoredDraft<AssociationBoardDraft> | null;
};

/**
 * The board builder — create and edit an Associations quiz (docs/quiz/associations.md,
 * "Authoring").
 *
 * <b>One screen, the board first.</b> The four Columns sit side by side the way the board is
 * played, each with its four Tiles and its solution under them, and the Final solution below
 * them all; the quiz's own fields (title, classification, status, board time) are the sidebar.
 * Under `xl` the Columns wrap two-and-two, and on a phone they stack (docs/RESPONSIVE.md).
 *
 * <b>Saved whole.</b> Quiz and Board go in one request and one server transaction, so there is no
 * partial save to recover from — and no questions-first dance like the Classic builder's.
 *
 * <b>Validation.</b> The zod schema is fast feedback; the API (`AssociationBoardValidator`) is the
 * gate, and its message names the Column and Tile. Server errors reach the user through the
 * shared axios interceptor, so this component only reports success.
 *
 * <b>Draft.</b> A new board is kept in the browser as the author types — a reload, a closed tab
 * or leaving the page doesn't lose it — exactly as the Classic builder does
 * (docs/quiz/quiz-draft-persistence.md). Edit mode keeps none, for the Classic builder's reason:
 * the board is already on the server, and a local copy would race the 409 that protects it.
 * A restored board is shown as it was, with no notice — the half-built board speaks for itself.
 *
 * <b>Leaving.</b> While a new board has typed work on it, leaving asks first
 * (`useNavigationGuard`) — the same guard as the Classic builder.
 */
export const AssociationBoardForm = ({
  edit,
  restoredDraft = null,
}: AssociationBoardFormProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addNotification } = useNotifications();
  const { queryData } = useQuizForm();

  const draftsEnabled = !edit;

  /**
   * The autosave and guard hooks live inside the `<Form>` render prop, where the values are; the
   * submit handler is out here. These are the wires between them, so a board that was really
   * created stops being offered back — cleared through the hook, which also cancels its pending
   * write (otherwise it lands during the redirect and resurrects the draft) — and the redirect
   * isn't stopped by the leave guard. Same wires as `create-quiz.tsx`.
   */
  const discardDraftRef = useRef<() => void>(() => {});
  const allowNavigationRef = useRef<() => void>(() => {});

  // The player dashboard and the admin dashboard both mount this; go back to whichever list
  // the author came from rather than hard-coding one (see create-quiz-method-dialog.tsx).
  const listPath = location.pathname.startsWith("/my-dashboard")
    ? "/my-dashboard/quizzes"
    : "/dashboard/quizzes";

  const createMutation = useCreateAssociationQuiz();
  const updateMutation = useUpdateAssociationQuiz();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (values: AssociationQuizFormValues) => {
    const payload = toAssociationQuizPayload(values);
    try {
      if (edit) {
        await updateMutation.mutateAsync({
          data: { ...payload, id: edit.quiz.id, version: edit.version },
        });
        addNotification({ type: "success", title: "Board saved" });
      } else {
        await createMutation.mutateAsync({ data: payload });
        discardDraftRef.current();
        allowNavigationRef.current();
        addNotification({
          type: "success",
          title: "Associations quiz created",
        });
      }
      navigate(listPath);
    } catch {
      // Already shown by the axios interceptor — including the 409 for a stale edit, whose
      // message says to reload.
    }
  };

  if (queryData.isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (queryData.error) {
    return (
      <div className="w-full p-8 text-center text-destructive">
        <Brain className="mx-auto mb-4 h-16 w-16 opacity-70" />
        <h3 className="text-xl font-bold">Oops! Brain freeze!</h3>
        <p>Error loading quiz data. Please try again.</p>
      </div>
    );
  }

  return (
    <Form
      id={edit ? "edit-association-board" : "create-association-board"}
      className="w-full"
      onSubmit={handleSubmit}
      schema={associationQuizFormSchema}
      options={{
        mode: "onSubmit",
        defaultValues: edit?.values ?? {
          ...emptyAssociationQuizFormValues(),
          ...(draftsEnabled ? restoredDraft?.data : undefined),
        },
      }}
    >
      {(methods) => (
        <BoardFields
          methods={methods}
          edit={edit}
          isSaving={isSaving}
          listPath={listPath}
          draftsEnabled={draftsEnabled}
          discardDraftRef={discardDraftRef}
          allowNavigationRef={allowNavigationRef}
        />
      )}
    </Form>
  );
};

type BoardFieldsProps = {
  methods: UseFormReturn<AssociationQuizFormValues>;
  edit: AssociationBoardFormProps["edit"];
  isSaving: boolean;
  listPath: string;
  draftsEnabled: boolean;
  discardDraftRef: MutableRefObject<() => void>;
  allowNavigationRef: MutableRefObject<() => void>;
};

/**
 * The builder's body. Its own component rather than the `<Form>` render prop itself, so the draft
 * and leave-guard hooks below are called from a component (rules of hooks) — the form's values
 * only exist inside `<Form>`, so this is where those hooks have to live.
 */
const BoardFields = ({
  methods,
  edit,
  isSaving,
  listPath,
  draftsEnabled,
  discardDraftRef,
  allowNavigationRef,
}: BoardFieldsProps) => {
  const { register, formState, setValue, watch, clearErrors } = methods;
  const navigate = useNavigate();
  const { queryData } = useQuizForm();
  const { data: user } = useUser();

  const { errors } = formState;

  // ── Draft persistence (docs/quiz/quiz-draft-persistence.md) ────────────────────
  //
  // `watch()` subscribes to every field, so this snapshot is rebuilt on each keystroke —
  // what the hook wants, since it compares contents, not identity. A cleared board-time
  // input is `NaN`, which JSON can't carry; it is left out, so a restore falls back to
  // the default.
  const formValues = watch();
  const draftCandidate: AssociationBoardDraft = {
    ...formValues,
    boardTimeInMinutes: Number.isFinite(formValues.boardTimeInMinutes)
      ? formValues.boardTimeInMinutes
      : undefined,
  };

  const hasUnsavedWork =
    draftsEnabled && isAssociationBoardDraftWorthKeeping(draftCandidate);

  const { savedAt: draftSavedAt, discard: discardDraft } =
    useDraftAutosave<AssociationBoardDraft>({
      slot: QUIZ_DRAFT_SLOTS.associations,
      userId: user?.id,
      version: ASSOCIATION_DRAFT_VERSION,
      // `enabled`, not a null value: edit mode shares this component and this slot, and a
      // null value would *delete* an unfinished new board the moment an author opened an
      // existing one to edit. See the hook's `enabled` doc.
      enabled: draftsEnabled,
      value: isAssociationBoardDraftWorthKeeping(draftCandidate)
        ? draftCandidate
        : null,
    });

  discardDraftRef.current = discardDraft;

  // Armed only while there is typed work: an untouched board never asks.
  const {
    showLeaveDialog,
    confirmNavigation,
    cancelNavigation,
    allowNavigation,
  } = useNavigationGuard(hasUnsavedWork);
  allowNavigationRef.current = allowNavigation;

  // The publishing gate, mirrored from the Classic builder: Public needs a real category,
  // language and difficulty (QuizService.EnsurePublishableAsync is the rule).
  const blockersFor = (ids: {
    categoryId?: number;
    languageId?: number;
    difficultyId?: number;
  }) =>
    [
      isUnspecifiedLookup(
        queryData.categories.find((c) => c.id === ids.categoryId)?.name,
      )
        ? "category"
        : null,
      isUnspecifiedLookup(
        queryData.languages.find((l) => l.id === ids.languageId)?.language,
      )
        ? "language"
        : null,
      isUnspecifiedLookup(
        queryData.difficulties.find((d) => d.id === ids.difficultyId)?.level,
      )
        ? "difficulty"
        : null,
    ].filter((field): field is string => field !== null);

  const currentIds = {
    categoryId: watch("categoryId"),
    languageId: watch("languageId"),
    difficultyId: watch("difficultyId"),
  };
  const unspecifiedFields = blockersFor(currentIds);
  const canPublish = unspecifiedFields.length === 0;
  const status = watch("status");

  /**
   * Sets a lookup, and if that makes Public impossible while Public is selected, falls the
   * status back to Draft — the server would refuse the save otherwise. Done in the change
   * handler rather than an Effect watching the result (CLAUDE.md, "Logic caused by a user
   * action belongs in the handler").
   */
  const setLookup = (
    field: "categoryId" | "languageId" | "difficultyId",
    raw: string,
  ) => {
    const value = parseInt(raw, 10);
    setValue(field, value);
    if (
      status === "Public" &&
      blockersFor({ ...currentIds, [field]: value }).length > 0
    ) {
      setValue("status", "Draft");
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 lg:p-6">
      <LeaveUnfinishedQuizDialog
        isOpen={showLeaveDialog}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
        draftSaved={draftSavedAt !== null}
      />

      {/* Header: its own way back, because full-width builder routes hide the nav. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(listPath)}
            aria-label="Back to quizzes"
            className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold">
              {edit
                ? `Edit board — ${edit.quiz.title}`
                : "New Associations board"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Four columns of four clues. Each column has a solution; the four
              solutions lead to the final one.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DraftSavedIndicator savedAt={draftSavedAt} />
          <LiftedButton type="submit" disabled={isSaving} isPending={isSaving}>
            {edit ? "Save board" : "Create quiz"}
          </LiftedButton>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* ── The board ── */}
        <div className="min-w-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {COLUMN_LETTERS.map((letter, index) => (
              <ColumnEditor
                key={letter}
                letter={letter}
                index={index}
                register={register}
                errors={errors}
              />
            ))}
          </div>

          {/* The four Columns lead into the Final — drawn only when they sit in one row. */}
          <BoardConnector />

          <FinalSolutionEditor
            register={register}
            errors={errors}
            setValue={setValue}
            initialOtherSpellings={watch("finalOtherSpellings")}
          />

          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              Guesses ignore capitals, accents and punctuation, so “Drite”
              counts for “Dritë”. Add other spellings only for genuinely
              different words (“Roma” for “Rome”).
            </span>
          </p>
        </div>

        {/* ── The quiz ── */}
        {/* self-start: sized by its own fields, not stretched to the board's height — the Final's
            added spelling rows used to grow it. */}
        <aside className="min-w-0 space-y-4 self-start rounded-xl border border-border bg-background p-4">
          <div>
            <Label
              htmlFor="title"
              className="flex items-center gap-1 text-sm font-medium"
            >
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              variant={errors.title ? "isIncorrect" : "minimal"}
              id="title"
              placeholder="Name this board"
              className="mt-1"
              aria-describedby="title-hint"
              {...register("title")}
              error={errors.title}
            />
            {/* The title is in the catalogue and the start dialog, so a player reads it before
                the first Tile — and the game screen deliberately doesn't show it
                (docs/quiz/associations.md §8.5). */}
            <p id="title-hint" className="mt-1 text-xs text-muted-foreground">
              Players see the title before they start. Keep the Final out of it
              — &ldquo;Italian cities&rdquo; gives away &ldquo;Italy&rdquo;.
            </p>
          </div>
          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              variant="minimal"
              id="description"
              placeholder="Optional — also shown before play"
              className="mt-1 min-h-[70px] resize-none"
              {...register("description")}
              error={errors.description}
            />
          </div>

          <Separator className="bg-primary/20" />

          <CategorySelect
            label="Category"
            categories={queryData.categories}
            fieldVariant="form"
            value={watch("categoryId")?.toString() || ""}
            onChange={(v: string) => setLookup("categoryId", v)}
            includeAllOption={false}
            error={errors.categoryId?.message}
            clearErrors={() => clearErrors("categoryId")}
          />
          <DifficultySelect
            label="Difficulty"
            difficulties={queryData.difficulties}
            fieldVariant="form"
            value={watch("difficultyId")?.toString() || ""}
            onChange={(v: string) => setLookup("difficultyId", v)}
            includeAllOption={false}
            error={errors.difficultyId?.message}
            clearErrors={() => clearErrors("difficultyId")}
          />
          <LanguageSelect
            label="Language"
            languages={queryData.languages}
            fieldVariant="form"
            value={watch("languageId")?.toString() || ""}
            includeAllOption={false}
            onChange={(v: string) => setLookup("languageId", v)}
            error={errors.languageId?.message}
            clearErrors={() => clearErrors("languageId")}
          />

          <Separator className="bg-primary/20" />

          <div>
            <Label className="mb-2 flex items-center gap-2 text-xs font-medium">
              Status
            </Label>
            <Select
              value={status || "Draft"}
              onValueChange={(value) => setValue("status", value as QuizStatus)}
            >
              <SelectTrigger variant="form" className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent variant="form">
                <SelectItem variant="form" value="Draft">
                  Draft — only you can see it
                </SelectItem>
                <SelectItem variant="form" value="Unlisted">
                  Unlisted — playable via share link
                </SelectItem>
                <SelectItem
                  variant="form"
                  value="Public"
                  disabled={!canPublish}
                >
                  Public — listed for everyone
                  {!canPublish && " (needs a full classification)"}
                </SelectItem>
              </SelectContent>
            </Select>
            {!canPublish && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  Set a real {unspecifiedFields.join(" and ")} to publish. Draft
                  and Unlisted work either way.
                </span>
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="boardTime" className="text-xs font-medium">
              Board time (minutes, solo play)
            </Label>
            <Input
              variant={errors.boardTimeInMinutes ? "isIncorrect" : "minimal"}
              id="boardTime"
              type="number"
              min={BOARD_MINUTES.min}
              max={BOARD_MINUTES.max}
              step={BOARD_MINUTES.step}
              className="mt-1"
              aria-describedby="boardTime-hint"
              {...register("boardTimeInMinutes", { valueAsNumber: true })}
              error={errors.boardTimeInMinutes}
            />
            {/* The range is stated up front: the form validates on submit, so without it the cap
                was only discovered by hitting it. */}
            <p id="boardTime-hint" className="mt-1 text-xs text-muted-foreground">
              Between {BOARD_MINUTES.min} and {BOARD_MINUTES.max} minutes.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

type ColumnEditorProps = {
  letter: string;
  index: number;
  register: UseFormRegister<AssociationQuizFormValues>;
  errors: FieldErrors<AssociationQuizFormValues>;
};

/** One Column: four Tiles in board order, then its solution and other spellings. */
const ColumnEditor = ({
  letter,
  index,
  register,
  errors,
}: ColumnEditorProps) => {
  const columnErrors = errors.columns?.[index];
  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-background p-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          {letter}
        </span>
        Column {letter}
      </h2>

      {[0, 1, 2, 3].map((tile) => (
        <Input
          key={tile}
          variant={columnErrors?.tiles?.[tile] ? "isIncorrect" : "minimal"}
          placeholder={`${letter}${tile + 1}`}
          aria-label={`Tile ${letter}${tile + 1}`}
          {...register(`columns.${index}.tiles.${tile}` as const)}
          error={columnErrors?.tiles?.[tile]}
        />
      ))}

      <div className="mt-1 space-y-2 border-t border-dashed border-primary/40 pt-2">
        {/* The solution is the answer, so it's marked as one: a green border, a hint of green
            in the fill and a green underline (global.css, `.board-solution-field` — a Tailwind
            class can't beat `.minimal-input`). An error still shows as the red underline and
            message. */}
        <div className="board-solution-field [--field-accent:var(--quiz-success)]">
          <Input
            variant={columnErrors?.solution ? "isIncorrect" : "minimal"}
            placeholder={`${letter} — solution`}
            aria-label={`Column ${letter} solution`}
            className="font-medium"
            {...register(`columns.${index}.solution` as const)}
            error={columnErrors?.solution}
          />
        </div>
        <Input
          variant={columnErrors?.otherSpellings ? "isIncorrect" : "minimal"}
          placeholder="Other spellings (optional)"
          aria-label={`Other accepted spellings for column ${letter}`}
          {...register(`columns.${index}.otherSpellings` as const)}
          error={columnErrors?.otherSpellings}
        />
      </div>
    </section>
  );
};

type FinalSolutionEditorProps = {
  register: UseFormRegister<AssociationQuizFormValues>;
  errors: FieldErrors<AssociationQuizFormValues>;
  setValue: UseFormSetValue<AssociationQuizFormValues>;
  /** The form's value on mount — the edit page's saved spellings, or "" for a new board. */
  initialOtherSpellings: string;
};

/**
 * The Final solution: one input, and a "+" that adds an input per other accepted spelling (up to
 * {@link BOARD_MAX_OTHER_SPELLINGS}). The form still holds the spellings as one comma-separated
 * string (`finalOtherSpellings`, parsed by `splitSpellings`), so the schema, the payload mapping
 * and the edit mapping are unchanged — this component keeps the rows and writes the joined value
 * back on every change. Blank rows are dropped by `splitSpellings`, so an added-but-empty row
 * saves nothing.
 */
const FinalSolutionEditor = ({
  register,
  errors,
  setValue,
  initialOtherSpellings,
}: FinalSolutionEditorProps) => {
  const [spellings, setSpellings] = useState<string[]>(() =>
    splitSpellings(initialOtherSpellings),
  );
  const canAdd = spellings.length < BOARD_MAX_OTHER_SPELLINGS;

  // Logic caused by a user action belongs in the handler (CLAUDE.md): each change writes the
  // form value directly rather than an Effect mirroring the rows.
  const update = (next: string[]) => {
    setSpellings(next);
    setValue("finalOtherSpellings", next.join(", "), { shouldDirty: true });
  };

  return (
    <section className="relative rounded-xl border-2 border-primary/40 bg-background p-4 xl:!mt-0">
      <h2 className="mb-3 text-center text-sm font-semibold uppercase tracking-wide text-primary">
        Final solution
      </h2>

      {/* Top right, out of the input's row: the Final is the one answer, the "+" is an extra.
          The tooltip's trigger is a span so it still explains itself once the button is
          disabled — a disabled <button> gets no pointer events, so Radix never opens on it. */}
      <div className="absolute right-3 top-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                {/* type="button": a LiftedButton is a plain <button>, which submits the form by default. */}
                <LiftedButton
                  type="button"
                  variant="icon"
                  onClick={() => update([...spellings, ""])}
                  disabled={!canAdd}
                  aria-label="Add another accepted spelling of the final solution"
                >
                  <Plus className="h-4 w-4" />
                </LiftedButton>
              </span>
            </TooltipTrigger>
            <TooltipContent className="bg-background border-foreground/50">
              <p>
                {canAdd
                  ? "Add another accepted spelling"
                  : `Up to ${BOARD_MAX_OTHER_SPELLINGS} other spellings`}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Input
        variant={errors.finalSolution ? "isIncorrect" : "minimal"}
        placeholder="What links the four column solutions"
        aria-label="Final solution"
        className="text-center"
        {...register("finalSolution")}
        error={errors.finalSolution}
      />

      {spellings.length > 0 && (
        <div className="mt-3 space-y-2 pl-3">
          {spellings.map((spelling, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  variant="minimal"
                  value={spelling}
                  // A row the author just added gets the cursor; rows loaded for an edit don't.
                  autoFocus={spelling === "" && i === spellings.length - 1}
                  placeholder="Another accepted spelling"
                  aria-label={`Other accepted spelling ${i + 1} of the final solution`}
                  onChange={(e) =>
                    update(
                      spellings.map((s, j) => (j === i ? e.target.value : s)),
                    )
                  }
                />
              </div>
              <button
                type="button"
                onClick={() => update(spellings.filter((_, j) => j !== i))}
                aria-label={`Remove spelling ${i + 1}`}
                className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive dark:hover:bg-red-500/20 dark:hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {errors.finalOtherSpellings && (
        <p className="mt-2 text-sm text-destructive">
          {errors.finalOtherSpellings.message}
        </p>
      )}
    </section>
  );
};

/**
 * Four lines from the bottom of each Column into the middle of the Final solution's card — the
 * board's rule drawn: every Column solution leads to the Final. Only at `xl`, where the Columns
 * sit in one row; two-and-two or stacked there is no layout for them to describe.
 *
 * The SVG stretches to the row (`preserveAspectRatio="none"`), so its x is a percentage of the
 * width: each line starts at a Column's centre (12.5/37.5/62.5/87.5 — the gaps between Columns
 * shift the outer ones by a few pixels, which doesn't read) and curves to 50. The strokes use
 * `non-scaling-stroke` so the stretch doesn't thicken them. Zero top and bottom margin, so the
 * lines touch the Columns above and the card below (the card drops its own `space-y` margin at
 * `xl` to match).
 *
 * <b>The beam.</b> Each line carries a short bright dash that travels down it into the dot, all
 * four together, and the dot pulses as they land (`.board-beam` / `.board-beam-dot` in
 * global.css). `pathLength={100}` makes the dash a fixed share of each line however long the
 * stretch makes it. Off under reduced motion.
 *
 * Pure decoration: `pointer-events-none select-none`, so neither the lines nor the dot can be
 * selected or get in the way of a click.
 */
const BoardConnector = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none relative hidden h-10 select-none xl:!mt-0 xl:block"
  >
    <svg
      className="h-full w-full overflow-visible"
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
    >
      {[12.5, 37.5, 62.5, 87.5].map((x) => {
        const d = `M ${x} 0 C ${x} 24, 50 16, 50 40`;
        return (
          <g key={x}>
            <path
              d={d}
              fill="none"
              className="stroke-primary/60"
              strokeWidth={2}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={d}
              pathLength={100}
              fill="none"
              className="board-beam stroke-primary dark:stroke-white"
              strokeWidth={2.5}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
    </svg>
    {/* Where they meet, on the card's top edge. */}
    <span className="board-beam-dot absolute bottom-0 left-1/2 z-10 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-primary" />
  </div>
);
