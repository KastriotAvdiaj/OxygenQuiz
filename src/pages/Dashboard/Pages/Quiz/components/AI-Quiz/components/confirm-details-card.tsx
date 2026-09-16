import { RotateCcw } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { QuestionCategory, QuestionLanguage } from "@/types/question-types";

import { CategorySelect } from "../../../../Question/Entities/Categories/Components/select-question-category";
import { LanguageSelect } from "../../../../Question/Entities/Language/components/select-question-language";
import { isUnspecifiedLookup } from "../../../../Question/Entities/lookup-visibility";

export interface ConfirmDetailsCardProps {
  categories: QuestionCategory[];
  languages: QuestionLanguage[];
  /**
   * The category the quiz will actually be saved with: the user's own pick when they made
   * one, otherwise the model's suggestion *after* it resolved against the real table. `null`
   * means nothing resolved, which is the only reason to ask for it.
   *
   * Deliberately **not** the user's raw pick. That is null whenever they left the field
   * alone — including when the model's suggestion matched perfectly — so a card opened
   * because the *category* was unmatched also asked for a language that was never in doubt,
   * and told the user their own language "isn't one of your languages". Picking the category
   * then jumped straight to review, because nothing was missing in the first place.
   */
  effectiveCategoryId: number | null;
  onCategoryIdChange: (id: number) => void;
  /** As `effectiveCategoryId`, for the language. */
  effectiveLanguageId: number | null;
  onLanguageIdChange: (id: number) => void;
  /** What the model said, so the user can see why it didn't stick. */
  suggestedCategoryName: string | null;
  suggestedLanguageName: string | null;
  onStartOver: () => void;
}

/**
 * Shown when the questions are ready but the model didn't give us a category or language we
 * can use — it invented one, picked a real-sounding name that isn't in this instance, or named
 * the seeded "Unspecified" row, which resolves but may never be stored on a question.
 *
 * The generation is not wasted. Throwing away a good set of questions because a *label*
 * didn't resolve would be the wrong trade, so we ask only for the field that's missing and
 * go straight to review. Naming the AI's rejected suggestion matters too: without it the
 * user is asked to fix something with no explanation of what went wrong.
 *
 * Each field is asked for on its own: the card is shown when *something* couldn't be placed,
 * which is rarely everything. See `effectiveCategoryId` for the distinction that decides it.
 *
 * The two rejections need different words. "Unspecified" *is* one of your categories, so
 * telling the user it isn't would be a plain lie about their own data — it was refused for
 * being a placeholder, not for being unknown.
 */
export const ConfirmDetailsCard = ({
  categories,
  languages,
  effectiveCategoryId,
  onCategoryIdChange,
  effectiveLanguageId,
  onLanguageIdChange,
  suggestedCategoryName,
  suggestedLanguageName,
  onStartOver,
}: ConfirmDetailsCardProps) => (
  <Card className="bg-background border-2 border-primary/30">
    <CardHeader className="bg-primary/10 border-b border-primary/30 py-3">
      <p className="font-semibold">Almost there</p>
      <p className="text-muted-foreground text-xs">
        Your questions are ready. We just need one or two details the AI couldn't match.
      </p>
    </CardHeader>
    {/* `form`, the same field the builder's Filters panel uses. It is the same question
        asked one screen earlier, so it should not be a different-looking control — and
        `minimal` here meant the first select a user ever saw for their category looked
        like nothing else in the quiz tooling. */}
    <CardContent className="space-y-4 pt-4">
      {effectiveCategoryId === null && (
        <div>
          <CategorySelect
            categories={categories}
            fieldVariant="form"
            value=""
            onChange={(v: string) => onCategoryIdChange(parseInt(v, 10))}
            includeAllOption={false}
          />
          {suggestedCategoryName && (
            <p className="text-muted-foreground text-xs mt-1">
              {isUnspecifiedLookup(suggestedCategoryName)
                ? "The AI didn't settle on a category. Pick one — the questions inherit it, and they can't be saved without it."
                : `The AI suggested "${suggestedCategoryName}", which isn't one of your categories.`}
            </p>
          )}
        </div>
      )}

      {effectiveLanguageId === null && (
        <div>
          <LanguageSelect
            languages={languages}
            fieldVariant="form"
            value=""
            onChange={(v: string) => onLanguageIdChange(parseInt(v, 10))}
            includeAllOption={false}
          />
          {suggestedLanguageName && (
            <p className="text-muted-foreground text-xs mt-1">
              {isUnspecifiedLookup(suggestedLanguageName)
                ? "The AI didn't settle on a language. Pick one — the questions inherit it, and they can't be saved without it."
                : `The AI suggested "${suggestedLanguageName}", which isn't one of your languages.`}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onStartOver}
        className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Start over
      </button>
    </CardContent>
  </Card>
);
