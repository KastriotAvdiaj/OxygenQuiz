import { useState } from "react";

/** The fields that carry over from one new question to the next. */
export interface CarriedFields {
  categoryId?: number;
  difficultyId?: number;
  languageId?: number;
}

/**
 * The question bank's create forms stay open after a save, so an author can make ten questions in
 * a row (2026-11-08; each save used to close the drawer). This holds what that needs:
 *
 * - `formKey` — bumps on every save. The form is keyed by it, so a save remounts it fresh: new
 *   default values, empty text and options, no leftover validation. CLAUDE.md: reset with `key`.
 * - `carried` — the category, difficulty and language of the last question, the next one's
 *   defaults: a batch is nearly always on one subject, and choosing them again each time is the
 *   tedium this exists to remove. Text, options, media and explanation start empty.
 * - `savedCount` — drives the drawer's "Question created" pill (FormDrawer `savedSignal`).
 * - `handleClosed` — the drawer was closed. If anything was saved since it opened, the batch is
 *   done, so `onFinished` (the page closes its type chooser); if nothing was, the author is
 *   back at the chooser to pick another type.
 */
export function useCreateAnother(onFinished?: () => void) {
  const [formKey, setFormKey] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [carried, setCarried] = useState<CarriedFields>({});

  return {
    formKey,
    savedCount,
    carried,
    markSaved(fields: CarriedFields) {
      setCarried({
        categoryId: fields.categoryId,
        difficultyId: fields.difficultyId,
        languageId: fields.languageId,
      });
      setFormKey((k) => k + 1);
      setSavedCount((n) => n + 1);
    },
    handleClosed() {
      if (savedCount > 0) onFinished?.();
      setSavedCount(0);
    },
  };
}
