import { useState } from "react";

import { useUser } from "@/lib/Auth";
import { readDraft } from "@/lib/drafts/draft-storage";

import {
  ManualQuizDraft,
  QUIZ_DRAFT_SLOTS,
  QUIZ_DRAFT_VERSION,
  parseManualQuizDraft,
} from "../quiz-drafts";

import CreateQuizForm from "./create-quiz";
import { QuizQuestionProvider } from "./Quiz-questions-context";

/**
 * The manual builder's route: reads any stored draft *before* the builder mounts, and seeds
 * it through the two props the builder already had.
 *
 * <b>Why a wrapper and not an Effect inside the form.</b> Hydration has to happen on the way
 * in. `QuizQuestionProvider` seeds `addedQuestions` from `initialQuestions` in a `useState`
 * initializer and the form seeds react-hook-form from `initialValues` in `defaultValues` —
 * both read once, at mount. Restoring from out here means the very first render already has
 * the user's work in it: no frame where the form is empty, no `reset()` racing the user's
 * first keystroke, and no new hydration path in the provider. The seams already existed for
 * edit mode and for the AI wizard's handoff; a draft is a third caller of the same two.
 *
 * `localStorage` is synchronous, which is what makes this possible — the read happens during
 * the initializer and there is nothing to wait for.
 *
 * See docs/quiz/quiz-draft-persistence.md.
 */
export const CreateQuizRoute = () => {
  const { data: user } = useUser();

  /**
   * Read once, and only once: after this the *form* owns the draft, and re-reading storage
   * would fight the writes it is making. `useState` with an initializer is the read-once
   * mechanism the codebase already uses for storage (`theme-provider.tsx`).
   *
   * Both dashboards' create routes sit behind `userAuthLoader`, which resolves the user into
   * the query cache before the route renders, so the id is here on the first render. If it
   * somehow isn't, `readDraft` returns null and the builder opens empty — a draft is a
   * convenience and never load-bearing.
   */
  const [restored] = useState(() =>
    readDraft<ManualQuizDraft>({
      slot: QUIZ_DRAFT_SLOTS.manual,
      userId: user?.id,
      version: QUIZ_DRAFT_VERSION,
      parse: parseManualQuizDraft,
    }),
  );

  return (
    <QuizQuestionProvider initialQuestions={restored?.data.questions}>
      <CreateQuizForm
        initialValues={restored?.data.form}
        restoredDraftSavedAt={restored?.savedAt ?? null}
      />
    </QuizQuestionProvider>
  );
};

export default CreateQuizRoute;
