import { z } from "zod";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiService } from "@/lib/Api-client";
import { MutationConfig, QueryConfig } from "@/lib/React-query";
import type { Quiz, QuizStatus } from "@/types/quiz-types";
import type { AssociationBoardDTO } from "@/types/association-types";

/**
 * Authoring an Associations quiz: the builder's form schema, the request shape, and the three
 * calls (create, read the board for editing, update). See docs/quiz/associations.md, "Authoring".
 *
 * <b>The schema mirrors the API; it is not the rule.</b> The gate is
 * `AssociationBoardValidator` on the server (and `AssociationRules` for the board time, which
 * is configurable there — the 60–1800s here are the documented defaults). This is fast feedback
 * while typing (CLAUDE.md, "Client validation mirrors an API rule").
 *
 * <b>The author types minutes; the API takes seconds.</b> A board runs for minutes, and "240"
 * made the author do the arithmetic. The form holds `boardTimeInMinutes` and the two mappings
 * below convert, so seconds stay the one unit on the wire and in the rules.
 */

/** Mirrors `AssociationBoardLimits.MaxTextLength`. */
export const BOARD_TEXT_MAX = 100;
/** Mirrors `AssociationBoardLimits.MaxAcceptableSolutions`. */
export const BOARD_MAX_OTHER_SPELLINGS = 4;
/** Mirror `AssociationRules` defaults (SoloMin/Max/DefaultBoardSeconds). The API enforces the configured values. */
export const BOARD_SECONDS = { min: 60, max: 1800, default: 240 } as const;
/** The same range in the builder's unit. Half minutes are allowed (`step`), so 90s is sayable. */
export const BOARD_MINUTES = {
  min: BOARD_SECONDS.min / 60,
  max: BOARD_SECONDS.max / 60,
  default: BOARD_SECONDS.default / 60,
  step: 0.5,
} as const;

const boardText = (what: string) =>
  z
    .string()
    .trim()
    .min(1, `${what} is required`)
    .max(BOARD_TEXT_MAX, `${what} must be ${BOARD_TEXT_MAX} characters or less`);

/**
 * Other accepted spellings, typed as one comma-separated line in the builder. Parsed by
 * `splitSpellings`; the server trims, de-duplicates and drops any that repeat the solution.
 */
const otherSpellings = z
  .string()
  .refine((value) => splitSpellings(value).length <= BOARD_MAX_OTHER_SPELLINGS, {
    message: `Up to ${BOARD_MAX_OTHER_SPELLINGS} other spellings`,
  });

export const associationQuizFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255, "Title must be 255 characters or less"),
  description: z.string().max(1000, "Description must be 1000 characters or less").optional().nullable(),
  categoryId: z.number().int().positive({ message: "Category is required" }),
  languageId: z.number().int().positive({ message: "Language is required" }),
  difficultyId: z.number().int().positive({ message: "Difficulty is required" }),
  status: z.enum(["Draft", "Unlisted", "Public"]).default("Draft"),
  boardTimeInMinutes: z
    .number({ invalid_type_error: "Board time is required" })
    .min(BOARD_MINUTES.min, `At least ${BOARD_MINUTES.min} minute`)
    .max(BOARD_MINUTES.max, `At most ${BOARD_MINUTES.max} minutes`),
  columns: z
    .array(
      z.object({
        tiles: z.array(boardText("Tile")).length(4),
        solution: boardText("Solution"),
        otherSpellings,
      })
    )
    .length(4),
  finalSolution: boardText("Final solution"),
  finalOtherSpellings: otherSpellings,
});

export type AssociationQuizFormValues = z.infer<typeof associationQuizFormSchema>;

/** "Roma, Rom" → ["Roma", "Rom"]. Blank entries dropped. */
export function splitSpellings(value: string | undefined | null): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** What the API takes (`AssociationQuizCM`). */
export type AssociationQuizPayload = {
  title: string;
  description?: string | null;
  categoryId: number;
  languageId: number;
  difficultyId: number;
  status: QuizStatus;
  boardTimeInSeconds: number;
  board: {
    columns: { tiles: string[]; solution: string; acceptableSolutions: string[] }[];
    finalSolution: string;
    finalAcceptableSolutions: string[];
  };
};

/** The form's shape → the request body. The only place the two meet. */
export function toAssociationQuizPayload(values: AssociationQuizFormValues): AssociationQuizPayload {
  return {
    title: values.title.trim(),
    description: values.description ?? null,
    categoryId: values.categoryId,
    languageId: values.languageId,
    difficultyId: values.difficultyId,
    status: values.status,
    // Rounded to the second: the API takes whole seconds, and 2.25 minutes is 135 of them.
    boardTimeInSeconds: Math.round(values.boardTimeInMinutes * 60),
    board: {
      columns: values.columns.map((column) => ({
        tiles: column.tiles.map((tile) => tile.trim()),
        solution: column.solution.trim(),
        acceptableSolutions: splitSpellings(column.otherSpellings),
      })),
      finalSolution: values.finalSolution.trim(),
      finalAcceptableSolutions: splitSpellings(values.finalOtherSpellings),
    },
  };
}

/** A stored board → the form's shape, for editing. */
export function toAssociationQuizFormValues(
  quiz: Pick<Quiz, "title" | "description" | "category" | "language" | "difficulty" | "status">,
  board: AssociationBoardDTO
): AssociationQuizFormValues {
  return {
    title: quiz.title,
    description: quiz.description ?? "",
    categoryId: quiz.category.id,
    languageId: quiz.language.id,
    difficultyId: quiz.difficulty.id,
    status: quiz.status,
    boardTimeInMinutes: board.boardTimeInSeconds / 60,
    columns: board.columns.map((column) => ({
      tiles: [...column.tiles].sort((a, b) => a.position - b.position).map((t) => t.text),
      solution: column.solution,
      otherSpellings: column.acceptableSolutions.join(", "),
    })),
    finalSolution: board.finalSolution,
    finalOtherSpellings: board.finalAcceptableSolutions.join(", "),
  };
}

/** A blank board for the create form. */
export const emptyAssociationQuizFormValues = (): Partial<AssociationQuizFormValues> => ({
  title: "",
  description: "",
  status: "Draft",
  boardTimeInMinutes: BOARD_MINUTES.default,
  columns: Array.from({ length: 4 }, () => ({ tiles: ["", "", "", ""], solution: "", otherSpellings: "" })),
  finalSolution: "",
  finalOtherSpellings: "",
});

// ── Calls ──────────────────────────────────────────────────────────────

export const associationBoardKeys = {
  all: ["associationBoard"] as const,
  byQuiz: (quizId: number) => ["associationBoard", quizId] as const,
};

/** Every list a new or changed quiz can appear in — the same key families the Classic mutations invalidate. */
const invalidateQuizLists = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ["quiz"] });
  queryClient.invalidateQueries({ queryKey: ["quizzes"] });
  queryClient.invalidateQueries({ queryKey: ["myQuizzes"] });
  queryClient.invalidateQueries({ queryKey: associationBoardKeys.all });
};

export const createAssociationQuiz = ({ data }: { data: AssociationQuizPayload }): Promise<Quiz> =>
  apiService.post("/quiz/associations", data);

export const useCreateAssociationQuiz = ({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof createAssociationQuiz> } = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};
  return useMutation({
    mutationFn: createAssociationQuiz,
    onSuccess: (...args) => {
      invalidateQuizLists(queryClient);
      onSuccess?.(...args);
    },
    ...rest,
  });
};

export const updateAssociationQuiz = ({
  data,
}: {
  data: AssociationQuizPayload & { id: number; version: number };
}): Promise<Quiz> => apiService.put("/quiz/associations", data);

export const useUpdateAssociationQuiz = ({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof updateAssociationQuiz> } = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = mutationConfig || {};
  return useMutation({
    mutationFn: updateAssociationQuiz,
    onSuccess: (...args) => {
      invalidateQuizLists(queryClient);
      onSuccess?.(...args);
    },
    ...rest,
  });
};

export const getAssociationBoard = (quizId: number): Promise<AssociationBoardDTO> =>
  apiService.get(`/quiz/${quizId}/board`);

export const getAssociationBoardQueryOptions = (quizId: number) =>
  queryOptions({
    queryKey: associationBoardKeys.byQuiz(quizId),
    queryFn: () => getAssociationBoard(quizId),
  });

export const useAssociationBoard = ({
  quizId,
  queryConfig,
}: {
  quizId: number;
  queryConfig?: QueryConfig<typeof getAssociationBoardQueryOptions>;
}) =>
  useQuery({
    ...getAssociationBoardQueryOptions(quizId),
    ...queryConfig,
  });
