import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sparkles,
  Copy,
  Check,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Brain,
} from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui";
import { LiftedButton } from "@/common/LiftedButton";
import { useNotifications } from "@/common/Notifications";
import { QuestionType } from "@/types/question-types";

import { CategorySelect } from "../../../Question/Entities/Categories/Components/select-question-category";
import { DifficultySelect } from "../../../Question/Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../../../Question/Entities/Language/components/select-question-language";

import { useQuizForm } from "../Create-Quiz-Form/use-quiz-form";
import { QuizQuestionProvider } from "../Create-Quiz-Form/Quiz-questions-context";
import CreateQuizForm from "../Create-Quiz-Form/create-quiz";
import { CreateQuizInput } from "../../api/create-quiz";

import { buildPrompt, AI_QUESTION_LIMITS } from "./prompt";
import { parseAiOutput, ParseResult } from "./parse-ai-output";

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  [QuestionType.MultipleChoice]: "Multiple Choice",
  [QuestionType.TrueFalse]: "True / False",
  [QuestionType.TypeTheAnswer]: "Type The Answer",
};

const ALL_TYPES = [
  QuestionType.MultipleChoice,
  QuestionType.TrueFalse,
  QuestionType.TypeTheAnswer,
];

export const AiQuizWizard = () => {
  const { queryData } = useQuizForm();
  const { addNotification } = useNotifications();
  const location = useLocation();

  const dashboardBase = location.pathname.startsWith("/my-dashboard")
    ? "/my-dashboard"
    : "/dashboard";
  const manualPath =
    dashboardBase === "/my-dashboard"
      ? "/my-dashboard/quizzes/create"
      : "/dashboard/quizzes/create-quiz";

  const [step, setStep] = useState<1 | 2>(1);

  // ── Step 1: quiz-level fields. These are the real entity IDs — chosen by a human,
  // never by the AI — and every generated question inherits category + language.
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [languageId, setLanguageId] = useState<number | null>(null);
  const [difficultyId, setDifficultyId] = useState<number | null>(null);

  // ── Step 2: source material + generation options
  const [sourceData, setSourceData] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [allowedTypes, setAllowedTypes] = useState<QuestionType[]>(ALL_TYPES);
  const [extraInstructions, setExtraInstructions] = useState("");

  const [copied, setCopied] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  const difficultyNames = useMemo(
    () => queryData.difficulties.map((d) => d.level),
    [queryData.difficulties]
  );

  const step1Complete =
    title.trim().length > 0 &&
    categoryId !== null &&
    languageId !== null &&
    difficultyId !== null;

  const canGenerate = sourceData.trim().length > 0 && allowedTypes.length > 0;

  const toggleType = (type: QuestionType) => {
    setAllowedTypes((current) =>
      current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type]
    );
  };

  const handleCopyPrompt = async () => {
    const prompt = buildPrompt({
      sourceData,
      questionCount,
      allowedTypes,
      difficultyNames,
      extraInstructions,
    });

    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      addNotification({
        type: "error",
        title: "Couldn't copy",
        message:
          "Your browser blocked clipboard access. Try again, or use a different browser.",
      });
    }
  };

  const handleImport = () => {
    if (categoryId === null || languageId === null || difficultyId === null) return;

    const result = parseAiOutput(aiResponse, {
      categoryId,
      languageId,
      quizDifficultyId: difficultyId,
      difficulties: queryData.difficulties,
    });

    setParseResult(result);

    if (!result.ok) {
      addNotification({
        type: "error",
        title: "Couldn't import",
        message: result.error ?? "That response couldn't be read.",
      });
    }
  };

  // ── Loading / error states for the entity lookups
  if (queryData.isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (queryData.error) {
    return (
      <div className="w-full p-8 text-center text-destructive">
        <Brain className="mx-auto h-16 w-16 mb-4 opacity-70" />
        <h3 className="text-xl font-bold">Oops! Brain freeze!</h3>
        <p>Error loading quiz data. Please try again.</p>
      </div>
    );
  }

  // ── Handoff: parsing succeeded, so drop the user into the real quiz builder with
  // everything prefilled. They get inline editing, validation and the normal submit path.
  if (parseResult?.ok) {
    const initialValues: Partial<CreateQuizInput> = {
      title: title.trim(),
      description: description.trim() || undefined,
      categoryId: categoryId!,
      languageId: languageId!,
      difficultyId: difficultyId!,
      status: "Draft",
      timeLimitInSeconds: 0,
      showFeedbackImmediately: false,
      shuffleQuestions: false,
    };

    return (
      <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
        <ImportSummary result={parseResult} />
        <div className="flex-1 min-h-0">
          <QuizQuestionProvider initialQuestions={parseResult.questions}>
            <CreateQuizForm initialValues={initialValues} aiImportMode />
          </QuizQuestionProvider>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`${dashboardBase}/quizzes`}
          className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to quizzes
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Create a quiz with AI
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          You'll set up the quiz, copy a prompt into any AI, then paste its answer back
          here. Nothing is saved until you review it.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        <StepPill index={1} label="Quiz details" active={step === 1} done={step > 1} />
        <div className="h-px flex-1 bg-border" />
        <StepPill index={2} label="Generate & import" active={step === 2} done={false} />
      </div>

      {step === 1 && (
        <Card className="bg-background border-2 border-primary/30">
          <CardHeader className="bg-primary/10 border-b border-primary/30 py-3">
            <p className="font-semibold">Quiz details</p>
            <p className="text-muted-foreground text-xs">
              Your questions will inherit this category and language.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div>
              <Label htmlFor="ai-title" className="text-sm font-medium">
                Quiz Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ai-title"
                variant="settings"
                className="mt-1"
                placeholder="Enter quiz title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="ai-description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="ai-description"
                variant="settings"
                className="mt-1 min-h-[70px] resize-none"
                placeholder="Describe your quiz"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Separator className="bg-primary/20" />

            <div className="space-y-3">
              <CategorySelect
                categories={queryData.categories}
                fieldVariant="minimal"
                value={categoryId?.toString() ?? ""}
                onChange={(v: string) => setCategoryId(parseInt(v, 10))}
                includeAllOption={false}
              />
              <LanguageSelect
                languages={queryData.languages}
                fieldVariant="minimal"
                value={languageId?.toString() ?? ""}
                onChange={(v: string) => setLanguageId(parseInt(v, 10))}
                includeAllOption={false}
              />
              <DifficultySelect
                difficulties={queryData.difficulties}
                fieldVariant="minimal"
                value={difficultyId?.toString() ?? ""}
                onChange={(v: string) => setDifficultyId(parseInt(v, 10))}
                includeAllOption={false}
              />
              <p className="text-muted-foreground text-xs">
                The AI will pick a difficulty per question from your existing list. This
                one is the quiz's overall rating and the fallback for anything it gets
                wrong.
              </p>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Link
                to={manualPath}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Create manually instead
              </Link>
              <LiftedButton
                type="button"
                disabled={!step1Complete}
                onClick={() => setStep(2)}
              >
                <span className="flex items-center gap-1">
                  Next <ArrowRight className="h-4 w-4" />
                </span>
              </LiftedButton>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="bg-background border-2 border-primary/30">
          <CardHeader className="bg-primary/10 border-b border-primary/30 py-3">
            <p className="font-semibold">Generate & import</p>
            <p className="text-muted-foreground text-xs">
              Paste your material, copy the prompt, then bring the AI's answer back.
            </p>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            {/* Source material */}
            <div>
              <Label htmlFor="ai-source" className="text-sm font-medium">
                Your material <span className="text-destructive">*</span>
              </Label>
              <p className="text-muted-foreground text-xs mb-1">
                Notes, an article, a transcript — whatever the quiz should be based on.
              </p>
              <Textarea
                id="ai-source"
                variant="settings"
                className="mt-1 min-h-[180px]"
                placeholder="Paste the text your quiz should be based on..."
                value={sourceData}
                onChange={(e) => setSourceData(e.target.value)}
              />
              {sourceData.length > AI_QUESTION_LIMITS.sourceWarningLength && (
                <p className="text-amber-600 dark:text-amber-500 text-xs mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  That's very long — most AIs will only read part of it. Consider
                  trimming.
                </p>
              )}
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ai-count" className="text-sm font-medium">
                  Number of questions
                </Label>
                <Input
                  id="ai-count"
                  type="number"
                  variant="settings"
                  className="mt-1"
                  min={AI_QUESTION_LIMITS.minQuestions}
                  max={AI_QUESTION_LIMITS.maxQuestions}
                  value={questionCount}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (Number.isNaN(n)) return;
                    setQuestionCount(
                      Math.min(
                        AI_QUESTION_LIMITS.maxQuestions,
                        Math.max(AI_QUESTION_LIMITS.minQuestions, n)
                      )
                    );
                  }}
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Question types</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ALL_TYPES.map((type) => {
                    const active = allowedTypes.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleType(type)}
                        className={`text-xs rounded-full px-3 py-1 border-2 transition-colors ${
                          active
                            ? "border-primary bg-primary/15 text-primary font-medium"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {QUESTION_TYPE_LABELS[type]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="ai-extra" className="text-sm font-medium">
                Extra instructions <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="ai-extra"
                variant="settings"
                className="mt-1"
                placeholder="e.g. focus on dates, keep it exam-style..."
                value={extraInstructions}
                onChange={(e) => setExtraInstructions(e.target.value)}
              />
            </div>

            <Separator className="bg-primary/20" />

            {/* Copy prompt */}
            <div className="rounded-lg border-2 border-dashed border-primary/40 p-4">
              <p className="font-medium text-sm mb-1">1. Copy the prompt</p>
              <p className="text-muted-foreground text-xs mb-3">
                We'll build a prompt from your material and settings. Paste it into
                ChatGPT, Claude, Gemini — whichever you use.
              </p>
              <LiftedButton
                type="button"
                disabled={!canGenerate}
                onClick={handleCopyPrompt}
              >
                <span className="flex items-center gap-2">
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copy prompt
                    </>
                  )}
                </span>
              </LiftedButton>
              {!canGenerate && (
                <p className="text-muted-foreground text-xs mt-2">
                  Add your material and pick at least one question type first.
                </p>
              )}
            </div>

            {/* Paste response */}
            <div>
              <p className="font-medium text-sm mb-1">2. Paste the AI's reply</p>
              <p className="text-muted-foreground text-xs mb-2">
                Copy the whole response back here. We'll check it before anything is
                saved.
              </p>
              <Textarea
                variant="settings"
                className="min-h-[160px] font-mono text-xs"
                placeholder='{ "questions": [ ... ] }'
                value={aiResponse}
                onChange={(e) => {
                  setAiResponse(e.target.value);
                  if (parseResult) setParseResult(null);
                }}
              />
              {parseResult && !parseResult.ok && (
                <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 p-3">
                  <p className="text-destructive text-sm flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    {parseResult.error}
                  </p>
                  {parseResult.dropped.length > 0 && (
                    <ul className="text-destructive/90 text-xs mt-2 space-y-1 pl-6 list-disc">
                      {parseResult.dropped.slice(0, 5).map((d) => (
                        <li key={d.index}>
                          Question {d.index}: {d.reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <LiftedButton
                type="button"
                disabled={aiResponse.trim().length === 0}
                onClick={handleImport}
              >
                <span className="flex items-center gap-1">
                  Review questions <ArrowRight className="h-4 w-4" />
                </span>
              </LiftedButton>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const StepPill = ({
  index,
  label,
  active,
  done,
}: {
  index: number;
  label: string;
  active: boolean;
  done: boolean;
}) => (
  <div
    className={`flex items-center gap-2 text-sm ${
      active ? "text-primary font-medium" : "text-muted-foreground"
    }`}
  >
    <span
      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs border-2 ${
        active || done
          ? "border-primary bg-primary/15 text-primary"
          : "border-border"
      }`}
    >
      {done ? <Check className="h-3 w-3" /> : index}
    </span>
    {label}
  </div>
);

/** Banner shown above the prefilled builder summarising what came through. */
const ImportSummary = ({ result }: { result: ParseResult }) => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const hasNotices =
    result.dropped.length > 0 || result.difficultyFallbacks.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1600px] rounded-lg border-2 border-primary/30 bg-primary/5 px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="text-sm">
          <p className="font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Imported {result.questions.length} question
            {result.questions.length === 1 ? "" : "s"} — review and edit before saving.
          </p>
          {hasNotices && (
            <ul className="text-muted-foreground text-xs mt-2 space-y-1 list-disc pl-5">
              {result.dropped.map((d) => (
                <li key={d.index}>
                  Skipped question {d.index} ({d.text.slice(0, 60)}
                  {d.text.length > 60 ? "…" : ""}): {d.reason}
                </li>
              ))}
              {result.difficultyFallbacks.length > 0 && (
                <li>
                  {result.difficultyFallbacks.length} question
                  {result.difficultyFallbacks.length === 1 ? "" : "s"} had an
                  unrecognised difficulty and fell back to the quiz's difficulty.
                </li>
              )}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground text-xs shrink-0"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default AiQuizWizard;
