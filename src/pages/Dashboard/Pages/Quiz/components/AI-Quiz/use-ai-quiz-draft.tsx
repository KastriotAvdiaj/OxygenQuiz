import { useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { useUser } from "@/lib/Auth";
import { readDraft } from "@/lib/drafts/draft-storage";
import { useDraftAutosave } from "@/hooks/use-draft-autosave";
import type { QuestionType } from "@/types/question-types";

import { CreateQuizInput } from "../../api/create-quiz";
import type {
  AiGenerateInput,
  AiGenerationMode,
} from "../../api/generate-ai-quiz";
import CreateQuizForm from "../Create-Quiz-Form/create-quiz";
import { QuizQuestionProvider } from "../Create-Quiz-Form/Quiz-questions-context";
import { useQuizForm } from "../Create-Quiz-Form/use-quiz-form";
import { isUnspecifiedLookup } from "../../../Question/Entities/lookup-visibility";
import {
  AiQuizDraft,
  QUIZ_DRAFT_SLOTS,
  QUIZ_DRAFT_VERSION,
  isAiQuizDraftWorthKeeping,
  parseAiQuizDraft,
} from "../quiz-drafts";

import { DEFAULT_AI_QUESTION_TYPES } from "./components/question-type-options";
import {
  extractQuizSuggestions,
  parseAiOutput,
  type ParseResult,
} from "./parse-ai-output";
import { AI_QUESTION_LIMITS, DEFAULT_QUESTION_COUNT } from "./prompt";

/**
 * Everything the two AI creation paths have in common (docs/quiz/ai-quiz-two-paths.md).
 *
 * The paths differ in one step: who runs the model. **Generate for me** posts to our API;
 * **Use your own AI** copies the prompt out and takes a reply back. Around that step they are
 * the same feature — the same request to describe, the same Advanced options, and the same
 * job once a reply exists: read it, resolve the names it used into ids, and hand the
 * questions to the builder. That middle is what lives here.
 *
 * It is a hook rather than a shared parent component because the two paths are two routes.
 * A parent would have to own the router, and the state deliberately does *not* survive the
 * trip between them: they are separate attempts, and carrying a half-filled topic across is a
 * surprise, not a convenience.
 *
 * Each container keeps only what is genuinely its own — the generate mutation and quota on
 * one side, the clipboard on the other.
 */
export const useAiQuizDraft = () => {
  const { queryData } = useQuizForm();
  const location = useLocation();
  const { data: user } = useUser();

  /**
   * <b>Which slot this page's unfinished work goes in.</b>
   *
   * One per AI path, because they are two attempts and not one — the same reason nothing
   * else survives the trip between them (see this hook's header). A topic typed on the
   * generate page appearing on the bring-your-own-AI page would be a surprise, not a
   * convenience.
   */
  const draftSlot = location.pathname.endsWith("/ai/own")
    ? QUIZ_DRAFT_SLOTS.aiOwn
    : QUIZ_DRAFT_SLOTS.aiTopic;

  /**
   * Read once, in an initialiser, so every `useState` below can open on the restored value
   * and the first render is already the user's page. An Effect copying storage into state
   * afterwards would show them an empty form first and fight anything they typed into it.
   *
   * See docs/quiz/quiz-draft-persistence.md.
   */
  const [restored] = useState(() =>
    readDraft<AiQuizDraft>({
      slot: draftSlot,
      userId: user?.id,
      version: QUIZ_DRAFT_VERSION,
      parse: parseAiQuizDraft,
    }),
  );
  const draft = restored?.data ?? null;

  /** Drives the "picked up where you left off" notice; cleared by "Start fresh". */
  const [restoredAt, setRestoredAt] = useState<number | null>(
    restored?.savedAt ?? null,
  );

  // Both dashboards mount these routes under their own prefix, so every path is derived
  // rather than hard-coded. See the route table in docs/quiz/ai-quiz-two-paths.md.
  const isUserDashboard = location.pathname.startsWith("/my-dashboard");
  const dashboardBase = isUserDashboard ? "/my-dashboard" : "/dashboard";
  const createBase = isUserDashboard
    ? "/my-dashboard/quizzes/create"
    : "/dashboard/quizzes/create-quiz";

  const paths = {
    quizzes: `${dashboardBase}/quizzes`,
    manualCreate: createBase,
    generate: `${createBase}/ai/topic`,
    material: `${createBase}/ai/material`,
    ownAi: `${createBase}/ai/own`,
  };

  // ── What the user is creating from.
  //
  // Read off the route, not held in state. The choice is made once in the create-quiz method
  // dialog and travels in the URL, which is what lets the wizard drop the tab strip it used
  // to ask with — see docs/quiz/ai-quiz-two-paths.md §3. `/ai/material` is not a registered
  // route yet (the chooser shows that option as "Soon"), so today this always resolves to
  // Topic; when slice 2.3 registers it, nothing here needs to change.
  const mode: AiGenerationMode = location.pathname.endsWith("/ai/material")
    ? "Source"
    : "Topic";
  const [topic, setTopic] = useState(draft?.topic ?? "");
  const [sourceData, setSourceData] = useState(draft?.sourceData ?? "");

  // ── Advanced: all optional. `null` means "let the model decide" for category and
  // language, and "use the default" for difficulty.
  const [title, setTitle] = useState(draft?.title ?? "");
  const [description, setDescription] = useState(draft?.description ?? "");
  const [categoryId, setCategoryId] = useState<number | null>(
    draft?.categoryId ?? null,
  );
  const [languageId, setLanguageId] = useState<number | null>(
    draft?.languageId ?? null,
  );
  const [difficultyId, setDifficultyId] = useState<number | null>(
    draft?.difficultyId ?? null,
  );
  const [questionCount, setQuestionCount] = useState(
    draft?.questionCount ?? DEFAULT_QUESTION_COUNT,
  );
  const [allowedTypes, setAllowedTypes] = useState<QuestionType[]>(
    () => draft?.allowedTypes ?? [...DEFAULT_AI_QUESTION_TYPES],
  );
  const [extraInstructions, setExtraInstructions] = useState(
    draft?.extraInstructions ?? "",
  );

  /**
   * The bring-your-own-AI paste box.
   *
   * <b>Why it lives here now.</b> It used to be the one piece of state `own-ai-quiz.tsx`
   * kept for itself, alongside the clipboard. But a pasted reply is a wall of text the user
   * fetched from another app, and losing it to a stray refresh is precisely the accident
   * this hook's snapshot exists to prevent — and state that has to be persisted *together*
   * belongs in one snapshot rather than two. It is unused on the generate path, as `mode`
   * and `sourceData` already are.
   */
  const [pastedReply, setPastedReply] = useState(draft?.pastedReply ?? "");

  /**
   * The model's reply, held raw until we have the ids needed to place it.
   *
   * **One field for both paths.** Generation and copy-paste produce the same JSON, so they
   * converge here — *before* anything is resolved, not after. Keeping the generated result
   * in its own state was the bug: the title/category/language the model returns were read
   * only on the generate path, so a pasted reply carrying all three still demanded them by
   * hand. See docs/quiz/ai-quiz-generation-flow.md §1a.
   */
  const [payload, setPayload] = useState<string | null>(draft?.payload ?? null);

  const { categories, difficulties, languages } = queryData;

  /**
   * The quiz's overall difficulty when the user didn't pick one. Prefers a mid-weighted
   * level over "first in the list", since the list is user-defined and its first entry
   * carries no meaning. Per-question difficulty is chosen by the model regardless; this is
   * the quiz's rating and the fallback for anything unrecognised.
   */
  const defaultDifficultyId = useMemo(() => {
    // Unspecified is not a rating, so it is not a candidate. It is seeded with weight 0, which
    // sorts it first — with a small lookup table it can win the median outright and hand the
    // quiz a difficulty that silently blocks publishing (`EnsurePublishableAsync`).
    const ratings = difficulties.filter((d) => !isUnspecifiedLookup(d.level));
    if (ratings.length === 0) return null;
    const sorted = [...ratings].sort((a, b) => a.weight - b.weight);
    return sorted[Math.floor(sorted.length / 2)].id;
  }, [difficulties]);

  /** The quiz-level fields the model returned, read from the payload whichever path it came by. */
  const suggestions = useMemo(
    () => (payload ? extractQuizSuggestions(payload) : null),
    [payload],
  );

  // Names, not ids, are what the model deals in — resolution happens here against lists we
  // already have, exactly as difficulty names have always been resolved.
  //
  // A resolver is also where a proposal gets **rejected**, and "Unspecified" is the proposal
  // that has to be. It is a real row, so it would resolve to a real id and travel on as a
  // perfectly valid-looking choice — right up to the API refusing it. Refusing it by name here
  // (not by trusting the prompt never to offer it) is what makes `needsConfirmation` fire, so
  // the user is asked for a category instead of being handed one that cannot be saved.
  // See ADR 0003 and docs/quiz/quiz-question-classification.md.
  const suggestedCategoryId = useMemo(() => {
    const name = suggestions?.category;
    if (!name || isUnspecifiedLookup(name)) return null;
    return (
      categories.find((c) => c.name.toLowerCase() === name.toLowerCase())?.id ??
      null
    );
  }, [suggestions?.category, categories]);

  const suggestedLanguageId = useMemo(() => {
    const name = suggestions?.language;
    if (!name || isUnspecifiedLookup(name)) return null;
    return (
      languages.find((l) => l.language.toLowerCase() === name.toLowerCase())
        ?.id ?? null
    );
  }, [suggestions?.language, languages]);

  // A user's explicit pick always wins over the model's suggestion. Derived, not stored:
  // state mirroring state has to be kept in sync forever and is always a render behind.
  const effectiveCategoryId = categoryId ?? suggestedCategoryId;
  const effectiveLanguageId = languageId ?? suggestedLanguageId;
  const effectiveDifficultyId = difficultyId ?? defaultDifficultyId;
  const effectiveTitle = title.trim() || suggestions?.title?.trim() || topic.trim();

  /** Every id the questions need is known, so they can be built. */
  const canPlaceQuestions =
    effectiveCategoryId !== null &&
    effectiveLanguageId !== null &&
    effectiveDifficultyId !== null;

  /**
   * The parsed payload, or null while we're still missing an id.
   *
   * Memoised for correctness rather than speed: the result seeds
   * `QuizQuestionProvider`'s `initialQuestions`, so handing it a fresh array on every
   * render invites the provider to reset the user's edits mid-review.
   */
  const parseResult = useMemo<ParseResult | null>(() => {
    if (!payload) return null;

    // A reply with no questions can't be placed and never will be — run the parser anyway so
    // the user gets its real diagnosis ("couldn't find any JSON", "wrong shape") instead of
    // being asked to pick a category for something that isn't a quiz. The ids below are
    // unused on this path: the parser bails long before it builds a question.
    if (suggestions?.hasQuestions === false) {
      return parseAiOutput(payload, {
        categoryId: effectiveCategoryId ?? 0,
        languageId: effectiveLanguageId ?? 0,
        quizDifficultyId: effectiveDifficultyId ?? 0,
        difficulties,
      });
    }

    if (!canPlaceQuestions) return null;

    return parseAiOutput(payload, {
      categoryId: effectiveCategoryId!,
      languageId: effectiveLanguageId!,
      quizDifficultyId: effectiveDifficultyId!,
      difficulties,
    });
  }, [
    payload,
    suggestions?.hasQuestions,
    canPlaceQuestions,
    effectiveCategoryId,
    effectiveLanguageId,
    effectiveDifficultyId,
    difficulties,
  ]);

  /**
   * Real questions in hand, but not the ids to place them. The model named a category or
   * language we don't have (or named none) and the user hadn't picked one either. The
   * questions are perfectly good, so the view asks for the one missing field rather than
   * throwing the reply away.
   */
  const needsConfirmation =
    payload !== null && suggestions?.hasQuestions === true && !canPlaceQuestions;

  const toggleType = (type: QuestionType) =>
    setAllowedTypes((current) =>
      current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type],
    );

  /** Clamped here rather than in a view: the bounds are a domain rule, not a layout one. */
  const handleQuestionCountChange = (value: number) =>
    setQuestionCount(
      Math.min(
        AI_QUESTION_LIMITS.maxGeneratedQuestions,
        Math.max(AI_QUESTION_LIMITS.minQuestions, value),
      ),
    );

  /**
   * Builds the request. The vocabularies we send are the ones the model may choose from —
   * and we only send the ones we actually want it to choose. A category the user already
   * picked isn't offered, so the model can't second-guess them and we don't pay for the
   * tokens.
   *
   * Both paths build it: `POST /quiz/ai-generate` takes it as a body, `POST /quiz/ai-prompt`
   * turns it into the text you paste elsewhere. That is what keeps the two paths honest —
   * one request shape, one prompt, no second copy to drift (plan §5.1).
   */
  const buildInput = (): AiGenerateInput => ({
    mode,
    topic: mode === "Topic" ? topic.trim() : undefined,
    sourceText: mode === "Source" ? sourceData.trim() : undefined,
    languageName:
      languageId !== null
        ? languages.find((l) => l.id === languageId)?.language
        : undefined,
    // The seeded "Unspecified" row is never part of a vocabulary we offer. It is an internal
    // default the app assigns, a question may never be stored as it, and a quiz filed under it
    // cannot be published — so naming it in the prompt only invites the one answer we are
    // obliged to reject. `AiGenerationService` drops it again on the way through, because the
    // prompt is a server-side contract and this caller is not the gate.
    languageNames: languages
      .filter((l) => !isUnspecifiedLookup(l.language))
      .map((l) => l.language),
    categoryNames:
      categoryId !== null
        ? []
        : categories
            .filter((c) => !isUnspecifiedLookup(c.name))
            .map((c) => c.name),
    // Difficulty is the one lookup a *question* may legally hold as Unspecified, but the model
    // is being asked to rate difficulty — a shrug is not one of the answers, and it would cost
    // the quiz its publishability.
    difficultyNames: difficulties
      .filter((d) => !isUnspecifiedLookup(d.level))
      .map((d) => d.level),
    questionCount,
    allowedTypes,
    extraInstructions: extraInstructions.trim() || undefined,
  });

  /**
   * Keep the page's unfinished work, so a refresh or a closed tab doesn't cost it.
   *
   * `payload` is the reason this exists. The typing is cheap to redo; a generation is not —
   * it came out of the user's quota, and losing it to a stray refresh makes them spend it
   * twice for one quiz. The card has always told people to keep the tab open while a
   * generation is *in flight* (`useNavigationGuard` enforces it, because there is no job id
   * to come back to); this covers everything on either side of that moment.
   */
  const { discard: discardStoredDraft } = useDraftAutosave<AiQuizDraft>({
    slot: draftSlot,
    userId: user?.id,
    version: QUIZ_DRAFT_VERSION,
    value: (() => {
      const candidate: AiQuizDraft = {
        topic,
        sourceData,
        title,
        description,
        categoryId,
        languageId,
        difficultyId,
        questionCount,
        allowedTypes,
        extraInstructions,
        pastedReply,
        payload,
      };
      // `null` for an untouched wizard: storing one would offer to restore work nobody did.
      return isAiQuizDraftWorthKeeping(candidate) ? candidate : null;
    })(),
  });

  /**
   * "Start fresh": throw the stored draft away and put the page back to how it opens.
   *
   * Distinct from `resetPayload` / the containers' "Start over", which discard a *reply* and
   * deliberately keep the topic that produced it so it can be tried again.
   */
  const discardDraft = () => {
    discardStoredDraft();
    setTopic("");
    setSourceData("");
    setTitle("");
    setDescription("");
    setCategoryId(null);
    setLanguageId(null);
    setDifficultyId(null);
    setQuestionCount(DEFAULT_QUESTION_COUNT);
    setAllowedTypes([...DEFAULT_AI_QUESTION_TYPES]);
    setExtraInstructions("");
    setPastedReply("");
    setPayload(null);
    setRestoredAt(null);
  };

  // ── Handoff: questions parsed, so hand the builder everything prefilled.
  // `aiImportMode` makes it submit through the atomic /quiz/ai-import endpoint
  // (docs/quiz/ai-quiz-architecture.md §7.3).
  const builderSlot: ReactNode =
    parseResult?.ok &&
    effectiveCategoryId !== null &&
    effectiveLanguageId !== null &&
    effectiveDifficultyId !== null ? (
      <QuizQuestionProvider initialQuestions={parseResult.questions}>
        <CreateQuizForm
          initialValues={
            {
              title: effectiveTitle,
              description: description.trim() || undefined,
              categoryId: effectiveCategoryId,
              languageId: effectiveLanguageId,
              difficultyId: effectiveDifficultyId,
              status: "Draft",
              timeLimitInSeconds: 0,
              showFeedbackImmediately: false,
              shuffleQuestions: false,
            } satisfies Partial<CreateQuizInput>
          }
          aiImportMode
          // The quiz exists on the server now, so the reply that produced it is no longer
          // unfinished work. Without this the wizard unmounts on the redirect, flushes its
          // pending write, and offers to restore the quiz the user just created.
          onSaved={discardDraft}
        />
      </QuizQuestionProvider>
    ) : undefined;

  return {
    // Lookups
    categories,
    difficulties,
    languages,
    /**
     * No `hasEntityError` companion to this. The three lookups are what these pages are
     * made of — you can't pick a category the list never loaded, and `buildInput` sends
     * those very names as the vocabulary the model may choose from — so they keep the
     * global `throwOnError` and a failure lands on the route's `DashboardErrorElement`.
     * Both views used to carry an in-page error card for this; it was unreachable, because
     * the throw happens before the view renders. See docs/development/error-handling.md.
     */
    isLoadingEntities: queryData.isLoading,

    // Where the other screens live
    paths,

    // The one box
    mode,
    topic,
    setTopic,
    sourceData,
    setSourceData,

    // Advanced
    title,
    setTitle,
    description,
    setDescription,
    categoryId,
    setCategoryId,
    languageId,
    setLanguageId,
    difficultyId,
    setDifficultyId,
    questionCount,
    setQuestionCount: handleQuestionCountChange,
    allowedTypes,
    toggleType,
    extraInstructions,
    setExtraInstructions,

    // Bring-your-own-AI: the reply the user pasted, before it reaches the parser.
    pastedReply,
    setPastedReply,

    /** When the restored draft was saved, or `null` if this is a fresh page. */
    restoredAt,
    /** Throws the stored draft away and empties the page. */
    discardDraft,

    // The reply, and everything downstream of it
    buildInput,
    payload,
    setPayload,
    /** Discards the questions and returns to the input. Containers add their own resets. */
    resetPayload: () => setPayload(null),
    parseResult,
    needsConfirmation,
    suggestedCategoryName: suggestions?.category ?? null,
    suggestedLanguageName: suggestions?.language ?? null,
    builderSlot,
  };
};
