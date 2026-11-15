import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useQuestionCategoryData } from "@/pages/Dashboard/Pages/Question/Entities/Categories/api/get-question-categories";
import { getQuestionDifficultyQueryOptions } from "@/pages/Dashboard/Pages/Question/Entities/Difficulty/api/get-question-difficulties";
import { getQuestionLanguageQueryOptions } from "@/pages/Dashboard/Pages/Question/Entities/Language/api/get-question-language";

import { readLanguageChoice, startingLanguages } from "../components/quiz-filters";
import { quizPlayPath } from "../quiz-play-path";
import { pickQuickPlay, quickPlayOptionsQueryOptions } from "./quick-play-api";
import { buildQuickPlayTiles, readSeenQuizzes, rememberSeenQuiz } from "./quick-play-model";
import { QuickPlayView } from "./quick-play-view";

/**
 * `/quick-play` — docs/quiz/quick-play.md. Reads what can be handed out, asks the server for one
 * quiz for the player's two choices, and goes to its play route, which is where a signed-out
 * visitor's one free quiz, a resumed session and everything else about starting are decided.
 *
 * <b>Language</b> follows the catalogue (`default-language.ts`): the languages the visitor chose
 * there, else English — and when English was our choice and has nothing, every language, so a
 * site with no English quizzes isn't an empty page.
 */
export function QuickPlay() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<number | "any" | null>(null);
  /** The difficulty last asked for (`undefined`: none yet), kept for "Play one again". */
  const [asked, setAsked] = useState<number | null | undefined>(undefined);

  const languages = useQuery(getQuestionLanguageQueryOptions());
  const categories = useQuestionCategoryData({});
  const difficulties = useQuery(getQuestionDifficultyQueryOptions());

  const { ids: startingIds, fromDefault } = startingLanguages(languages.data ?? [], readLanguageChoice());
  const narrowed = useQuery({ ...quickPlayOptionsQueryOptions(startingIds), enabled: languages.isSuccess });
  const widen = fromDefault && narrowed.data?.length === 0;
  const everything = useQuery({ ...quickPlayOptionsQueryOptions([]), enabled: widen });
  const options = widen ? everything : narrowed;
  const languageIds = widen ? [] : startingIds;

  const tiles = buildQuickPlayTiles(options.data ?? [], categories.data ?? [], difficulties.data ?? []);

  const pick = useMutation({
    mutationFn: pickQuickPlay,
    onSuccess: (result) => {
      if (result.kind !== "quiz") {
        // Nothing matches any more: someone unpublished it since the tiles were read.
        if (result.kind === "none") void options.refetch();
        return;
      }
      rememberSeenQuiz(result.quizId);
      navigate(quizPlayPath({ id: result.quizId }));
    },
  });

  const play = (difficultyId: number | null, allowRepeats = false) => {
    if (selectedId === null) return;
    setAsked(difficultyId);
    const seen = readSeenQuizzes();
    pick.mutate({
      categoryId: selectedId === "any" ? undefined : selectedId,
      difficultyId: difficultyId ?? undefined,
      languageIds,
      // "Again" may repeat anything but the quiz most recently handed out.
      exclude: allowRepeats ? seen.slice(-1) : seen,
      allowRepeats,
    });
  };

  const loading = languages.isPending || categories.isPending || difficulties.isPending || options.isPending;
  if (loading && !(languages.isError || categories.isError || difficulties.isError || options.isError)) return null;

  return (
    <QuickPlayView
      tiles={tiles}
      loadFailed={languages.isError || categories.isError || difficulties.isError || options.isError}
      onRetryLoad={() => {
        void languages.refetch();
        void categories.refetch();
        void difficulties.refetch();
        void options.refetch();
      }}
      selectedId={selectedId}
      onSelect={(id) => {
        setSelectedId(id);
        setAsked(undefined);
        pick.reset();
      }}
      onPlay={(difficultyId) => play(difficultyId)}
      onPlayAgain={() => play(asked ?? null, true)}
      pending={pick.isPending ? (asked ?? "any") : null}
      exhausted={pick.data?.kind === "exhausted"}
      pickFailed={pick.isError || pick.data?.kind === "none"}
    />
  );
}
