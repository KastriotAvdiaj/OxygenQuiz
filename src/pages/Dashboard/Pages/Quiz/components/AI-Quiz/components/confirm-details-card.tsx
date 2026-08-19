import { RotateCcw } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { QuestionCategory, QuestionLanguage } from "@/types/question-types";

import { CategorySelect } from "../../../../Question/Entities/Categories/Components/select-question-category";
import { LanguageSelect } from "../../../../Question/Entities/Language/components/select-question-language";

export interface ConfirmDetailsCardProps {
  categories: QuestionCategory[];
  languages: QuestionLanguage[];
  categoryId: number | null;
  onCategoryIdChange: (id: number) => void;
  languageId: number | null;
  onLanguageIdChange: (id: number) => void;
  /** What the model said, so the user can see why it didn't stick. */
  suggestedCategoryName: string | null;
  suggestedLanguageName: string | null;
  onStartOver: () => void;
}

/**
 * Shown when the questions are ready but the model named a category or language we don't
 * have — it invented one, or picked a real-sounding name that isn't in this instance.
 *
 * The generation is not wasted. Throwing away a good set of questions because a *label*
 * didn't resolve would be the wrong trade, so we ask only for the field that's missing and
 * go straight to review. Naming the AI's rejected suggestion matters too: without it the
 * user is asked to fix something with no explanation of what went wrong.
 */
export const ConfirmDetailsCard = ({
  categories,
  languages,
  categoryId,
  onCategoryIdChange,
  languageId,
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
    <CardContent className="space-y-4 pt-4">
      {categoryId === null && (
        <div>
          <CategorySelect
            categories={categories}
            fieldVariant="minimal"
            value=""
            onChange={(v: string) => onCategoryIdChange(parseInt(v, 10))}
            includeAllOption={false}
          />
          {suggestedCategoryName && (
            <p className="text-muted-foreground text-xs mt-1">
              The AI suggested "{suggestedCategoryName}", which isn't one of your categories.
            </p>
          )}
        </div>
      )}

      {languageId === null && (
        <div>
          <LanguageSelect
            languages={languages}
            fieldVariant="minimal"
            value=""
            onChange={(v: string) => onLanguageIdChange(parseInt(v, 10))}
            includeAllOption={false}
          />
          {suggestedLanguageName && (
            <p className="text-muted-foreground text-xs mt-1">
              The AI suggested "{suggestedLanguageName}", which isn't one of your languages.
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
