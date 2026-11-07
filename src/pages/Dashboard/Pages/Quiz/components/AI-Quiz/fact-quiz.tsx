import { useState } from "react";

import { isUnspecifiedLookup } from "../../../Question/Entities/lookup-visibility";
import { FactQuizError, useBuildFactQuiz, useFactPacks } from "../../api/fact-quiz";

import { FactQuizView } from "./fact-quiz-view";
import { useAiQuizDraft } from "./use-ai-quiz-draft";

/**
 * Container for **From facts** (docs/quiz/fact-quizzes.md): pick a fact pack, a language and how
 * many questions; the server fills its templates from Wikidata facts and answers in a model
 * reply's shape, which goes into `useAiQuizDraft` like a generated or pasted one. From there the
 * review, the quote check against the facts, and the save are the AI path's, unchanged.
 *
 * What's held here and not in the draft — the pack and the language — is the brief, which the
 * draft deliberately doesn't keep (see its header): picking again costs a click.
 */
export const FactQuiz = () => {
  const draft = useAiQuizDraft();
  const packs = useFactPacks();
  const build = useBuildFactQuiz();

  const [pickedSlug, setPickedSlug] = useState<string | null>(null);
  // Albanian first: the app's audience, and the language the AI writes worst in — the one
  // where a quiz from facts matters most.
  const [language, setLanguage] = useState("Albanian");
  const [buildError, setBuildError] = useState<string | null>(null);

  // Derived, not stored: the first pack until one is picked.
  const selectedSlug = pickedSlug ?? packs.data?.[0]?.slug ?? null;
  const pack = packs.data?.find((p) => p.slug === selectedSlug);

  const handleSelectPack = (slug: string) => {
    setPickedSlug(slug);
    setBuildError(null);
    // Keep the language if the new pack has it; otherwise its first.
    const next = packs.data?.find((p) => p.slug === slug);
    if (next && !(language in next.factsByLanguage)) setLanguage(Object.keys(next.factsByLanguage)[0]);
  };

  const handleBuild = () => {
    if (!pack) return;
    setBuildError(null);
    build.mutate(
      {
        packSlug: pack.slug,
        languageName: language,
        questionCount: draft.questionCount,
        allowedTypes: draft.allowedTypes.filter((t) => pack.questionTypes.includes(t)),
        difficultyNames: draft.difficulties.filter((d) => !isUnspecifiedLookup(d.level)).map((d) => d.level),
      },
      {
        onSuccess: (result) => draft.setPayload(result.payload, result.grounding),
        onError: (error) =>
          setBuildError(error instanceof FactQuizError ? error.message : "Couldn't build the quiz. Try again."),
      },
    );
  };

  return (
    <FactQuizView
      backPath={draft.paths.quizzes}
      generatePath={draft.paths.generate}
      manualCreatePath={draft.paths.manualCreate}
      packs={packs.data ?? []}
      isLoadingPacks={packs.isLoading}
      packsFailed={packs.isError}
      selectedSlug={selectedSlug}
      onSelectPack={handleSelectPack}
      language={language}
      onLanguageChange={(l) => {
        setLanguage(l);
        setBuildError(null);
      }}
      questionCount={draft.questionCount}
      onQuestionCountChange={draft.setQuestionCount}
      allowedTypes={draft.allowedTypes}
      onToggleType={draft.toggleType}
      onBuild={handleBuild}
      isBuilding={build.isPending}
      buildError={buildError}
      isLoadingEntities={draft.isLoadingEntities}
      parseResult={draft.parseResult}
      needsConfirmation={draft.needsConfirmation}
      categories={draft.categories}
      languages={draft.languages}
      effectiveCategoryId={draft.effectiveCategoryId}
      onCategoryIdChange={draft.setCategoryId}
      effectiveLanguageId={draft.effectiveLanguageId}
      onLanguageIdChange={draft.setLanguageId}
      suggestedCategoryName={draft.suggestedCategoryName}
      suggestedLanguageName={draft.suggestedLanguageName}
      onStartOver={draft.resetPayload}
      builderSlot={draft.builderSlot}
    />
  );
};

export default FactQuiz;
