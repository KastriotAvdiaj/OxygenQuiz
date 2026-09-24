import { useLocation, useNavigate } from "react-router";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { ArrowLeft, Brain, Info, Link2 } from "lucide-react";

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
import { useNotifications } from "@/common/Notifications";
import { COLUMN_LETTERS } from "@/types/association-types";
import type { Quiz, QuizStatus } from "@/types/quiz-types";

import { CategorySelect } from "../../../Question/Entities/Categories/Components/select-question-category";
import { DifficultySelect } from "../../../Question/Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../../../Question/Entities/Language/components/select-question-language";
import { isUnspecifiedLookup } from "../../../Question/Entities/lookup-visibility";
import { useQuizForm } from "../Create-Quiz-Form/use-quiz-form";
import {
  associationQuizFormSchema,
  BOARD_SECONDS,
  emptyAssociationQuizFormValues,
  toAssociationQuizPayload,
  useCreateAssociationQuiz,
  useUpdateAssociationQuiz,
  type AssociationQuizFormValues,
} from "../../api/association-quiz";

type AssociationBoardFormProps = {
  /** Edit mode: the quiz being edited, and its board already mapped to form values. */
  edit?: { quiz: Quiz; values: AssociationQuizFormValues; version: number };
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
 */
export const AssociationBoardForm = ({ edit }: AssociationBoardFormProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addNotification } = useNotifications();
  const { queryData } = useQuizForm();

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
        addNotification({ type: "success", title: "Associations quiz created" });
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
        defaultValues: edit?.values ?? emptyAssociationQuizFormValues(),
      }}
    >
      {({ register, formState, setValue, watch, clearErrors }) => {
        const { errors } = formState;

        // The publishing gate, mirrored from the Classic builder: Public needs a real category,
        // language and difficulty (QuizService.EnsurePublishableAsync is the rule).
        const blockersFor = (ids: { categoryId?: number; languageId?: number; difficultyId?: number }) =>
          [
            isUnspecifiedLookup(queryData.categories.find((c) => c.id === ids.categoryId)?.name) ? "category" : null,
            isUnspecifiedLookup(queryData.languages.find((l) => l.id === ids.languageId)?.language) ? "language" : null,
            isUnspecifiedLookup(queryData.difficulties.find((d) => d.id === ids.difficultyId)?.level) ? "difficulty" : null,
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
        const setLookup = (field: "categoryId" | "languageId" | "difficultyId", raw: string) => {
          const value = parseInt(raw, 10);
          setValue(field, value);
          if (status === "Public" && blockersFor({ ...currentIds, [field]: value }).length > 0) {
            setValue("status", "Draft");
          }
        };

        return (
          <div className="mx-auto w-full max-w-7xl space-y-6 p-4 lg:p-6">
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
                    {edit ? `Edit board — ${edit.quiz.title}` : "New Associations board"}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Four columns of four clues. Each column has a solution; the four solutions lead to the final one.
                  </p>
                </div>
              </div>
              <LiftedButton type="submit" disabled={isSaving} isPending={isSaving}>
                {edit ? "Save board" : "Create quiz"}
              </LiftedButton>
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

                <section className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
                      Final solution
                    </h2>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      variant={errors.finalSolution ? "isIncorrect" : "minimal"}
                      placeholder="What links the four column solutions"
                      aria-label="Final solution"
                      {...register("finalSolution")}
                      error={errors.finalSolution}
                    />
                    <Input
                      variant={errors.finalOtherSpellings ? "isIncorrect" : "minimal"}
                      placeholder="Other spellings, comma-separated (optional)"
                      aria-label="Other accepted spellings of the final solution"
                      {...register("finalOtherSpellings")}
                      error={errors.finalOtherSpellings}
                    />
                  </div>
                </section>

                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>
                    Guesses ignore capitals, accents and punctuation, so “Drite” counts for “Dritë”.
                    Add other spellings only for genuinely different words (“Roma” for “Rome”).
                  </span>
                </p>
              </div>

              {/* ── The quiz ── */}
              <aside className="min-w-0 space-y-4 rounded-xl border border-border p-4">
                <div>
                  <Label htmlFor="title" className="flex items-center gap-1 text-sm font-medium">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    variant={errors.title ? "isIncorrect" : "minimal"}
                    id="title"
                    placeholder="Name this board"
                    className="mt-1"
                    {...register("title")}
                    error={errors.title}
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    variant="minimal"
                    id="description"
                    placeholder="Optional"
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
                  <Label className="mb-2 flex items-center gap-2 text-xs font-medium">Status</Label>
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
                      <SelectItem variant="form" value="Public" disabled={!canPublish}>
                        Public — listed for everyone
                        {!canPublish && " (needs a full classification)"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {!canPublish && (
                    <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Info className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>
                        Set a real {unspecifiedFields.join(" and ")} to publish. Draft and Unlisted work either way.
                      </span>
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="boardTime" className="text-xs font-medium">
                    Board time (seconds, solo play)
                  </Label>
                  <Input
                    variant={errors.boardTimeInSeconds ? "isIncorrect" : "minimal"}
                    id="boardTime"
                    type="number"
                    min={BOARD_SECONDS.min}
                    max={BOARD_SECONDS.max}
                    className="mt-1"
                    {...register("boardTimeInSeconds", { valueAsNumber: true })}
                    error={errors.boardTimeInSeconds}
                  />
                </div>
              </aside>
            </div>
          </div>
        );
      }}
    </Form>
  );
};

type ColumnEditorProps = {
  letter: string;
  index: number;
  register: UseFormRegister<AssociationQuizFormValues>;
  errors: FieldErrors<AssociationQuizFormValues>;
};

/** One Column: four Tiles in board order, then its solution and other spellings. */
const ColumnEditor = ({ letter, index, register, errors }: ColumnEditorProps) => {
  const columnErrors = errors.columns?.[index];
  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-3">
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
        <Input
          variant={columnErrors?.solution ? "isIncorrect" : "minimal"}
          placeholder={`${letter} — solution`}
          aria-label={`Column ${letter} solution`}
          {...register(`columns.${index}.solution` as const)}
          error={columnErrors?.solution}
        />
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
