// components/question-settings/QuestionSettingsCard.tsx
import React from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuiz } from "../Quiz-questions-context";
import { Label } from "@/components/ui/form";
import {
  POINT_SYSTEM_OPTIONS,
  TIME_LIMIT_OPTIONS,
} from "@/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/constants";
import { QuizQuestion } from "../types";

interface QuestionSettingsCardProps {
  question: QuizQuestion;
  showCopyActions?: boolean;
}

export const QuestionSettingsCard: React.FC<QuestionSettingsCardProps> = ({
  question,
  showCopyActions = true,
}) => {
  const {
    updateQuestionSetting,
    getQuestionSettings,
    // copySettingsToQuestion,
    // resetQuestionSettings,
    // addedQuestions,
  } = useQuiz();

  const settings = getQuestionSettings(question.id);

  /**
   * The time-limit options, plus the current value if it isn't one of them.
   *
   * A Radix `Select` whose `value` matches no `SelectItem` renders its placeholder — and with
   * a bare `<SelectValue />` that is nothing at all. The trigger goes blank while the state
   * quietly still holds the value, so the author sees an empty dropdown, has no idea what the
   * question is set to, and saves it unchanged.
   *
   * The AI path is fixed upstream now (the prompt asks for one of `TIME_LIMIT_OPTIONS` and
   * `parse-ai-output.ts` snaps anything else), but that only protects values arriving through
   * *that* door. `AiQuizImportCM` accepts `[Range(0, 2000)]` and the manual create schema the
   * same, so the data-transfer importer, a direct API call, or a quiz saved before the snap
   * existed can all put an off-list number in front of this control. Showing it as its own
   * option costs one array entry and makes a blank trigger unreachable.
   */
  const timeLimitOptions: { value: number; label: string }[] = React.useMemo(() => {
    const current = settings.timeLimitInSeconds;
    if (TIME_LIMIT_OPTIONS.some((option) => option.value === current)) {
      return [...TIME_LIMIT_OPTIONS];
    }
    return [
      ...TIME_LIMIT_OPTIONS,
      { value: current, label: `${current} seconds` },
    ].sort((a, b) => a.value - b.value);
  }, [settings.timeLimitInSeconds]);

  // const handleCopyFrom = (sourceQuestionId: number) => {
  //   copySettingsToQuestion(sourceQuestionId, question.id);
  // };

  return (
    <div className="w-full h-full flex flex-col">
      <CardHeader className="pb-4 px-4 sm:px-6">
        <CardTitle className="text-sm sm:text-base flex items-center justify-between gap-3 border-b border-border pb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1 ">
            <span className="truncate text-primary">
              {question.text || `Question ${settings.orderInQuiz + 1}`}
            </span>
          </div>
          <Badge
            variant="outline"
            className="text-xs whitespace-nowrap flex-shrink-0"
          >
            #{settings.orderInQuiz + 1}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-5 px-4 sm:px-6 pb-6">
        {/* Point System */}
        <div className="space-y-2.5">
          <Label className="text-xs font-medium">Point System</Label>
          <Select
            value={settings.pointSystem}
            onValueChange={(value) =>
              updateQuestionSetting(question.id, "pointSystem", value)
            }
          >
            <SelectTrigger
              variant="form"
              className="h-9 sm:h-10 text-xs w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POINT_SYSTEM_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-xs sm:text-sm"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Time Limit */}
        <div className="space-y-2.5">
          <Label className="text-xs font-medium">Time Limit</Label>
          <Select
            value={settings.timeLimitInSeconds.toString()}
            onValueChange={(value) =>
              updateQuestionSetting(
                question.id,
                "timeLimitInSeconds",
                parseInt(value),
              )
            }
          >
            <SelectTrigger
              variant="form"
              className="h-9 sm:h-10 text-xs w-full"
            >
              {/* Belt and braces: `timeLimitOptions` guarantees a match, so this should never
                  show. If it ever does, "Select time limit" is a legible failure — an empty
                  trigger is not. */}
              <SelectValue placeholder="Select time limit" />
            </SelectTrigger>
            <SelectContent>
              {timeLimitOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  variant="form"
                  value={option.value.toString()}
                  className="text-xs sm:text-sm"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        {showCopyActions && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3">
            {/* <Button
              variant="outline"
              size="sm"
              onClick={() => resetQuestionSettings(question.id)}
              className="h-9 text-xs flex-1 w-full sm:w-auto rounded-sm"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button> */}

            {/* {addedQuestions.length > 1 && (
              <Select
                onValueChange={(value) => handleCopyFrom(parseInt(value))}
              >
                <SelectTrigger className="h-9 text-xs flex-1 w-full sm:w-auto rounded-sm">
                  <div className="flex items-center gap-2">
                    <Copy className="h-3.5 w-3.5" />
                    Copy From
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {addedQuestions
                    .filter((q) => q.id !== question.id)
                    .map((q) => (
                      <SelectItem
                        key={q.id}
                        value={q.id.toString()}
                        className="text-xs sm:text-sm"
                      >
                        {q.text ||
                          `Question ${
                            getQuestionSettings(q.id).orderInQuiz + 1
                          }`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )} */}
          </div>
        )}
      </CardContent>
    </div>
  );
};
