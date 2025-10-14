// components/question-settings/QuestionSettingsCard.tsx
import React from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, RotateCcw, Settings } from "lucide-react";
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
    copySettingsToQuestion,
    resetQuestionSettings,
    addedQuestions,
  } = useQuiz();

  const settings = getQuestionSettings(question.id);

  const handleCopyFrom = (sourceQuestionId: number) => {
    copySettingsToQuestion(sourceQuestionId, question.id);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <CardHeader className="pb-4 px-4 sm:px-6">
        <CardTitle className="text-sm sm:text-base flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span className="truncate">
              {question.text || `Question ${settings.orderInQuiz + 1}`}
            </span>
          </div>
          <Badge variant="outline" className="text-xs whitespace-nowrap flex-shrink-0">
            #{settings.orderInQuiz + 1}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-5 px-4 sm:px-6 pb-6">
        {/* Point System */}
        <div className="space-y-2.5">
          <Label className="text-xs sm:text-sm font-medium">Point System</Label>
          <Select
            value={settings.pointSystem}
            onValueChange={(value) =>
              updateQuestionSetting(question.id, "pointSystem", value)
            }
          >
            <SelectTrigger variant="quiz" className="h-9 sm:h-10 text-xs sm:text-sm w-full">
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
          <Label className="text-xs sm:text-sm font-medium">Time Limit</Label>
          <Select
            value={settings.timeLimitInSeconds.toString()}
            onValueChange={(value) =>
              updateQuestionSetting(
                question.id,
                "timeLimitInSeconds",
                parseInt(value)
              )
            }
          >
            <SelectTrigger variant="quiz" className="h-9 sm:h-10 text-xs sm:text-sm w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_LIMIT_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetQuestionSettings(question.id)}
              className="h-9 text-xs sm:text-sm flex-1 w-full sm:w-auto"
            >
              <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
              Reset
            </Button>

            {addedQuestions.length > 1 && (
              <Select
                onValueChange={(value) => handleCopyFrom(parseInt(value))}
              >
                <SelectTrigger className="h-9 text-xs sm:text-sm flex-1 w-full sm:w-auto">
                  <div className="flex items-center">
                    <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
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
            )}
          </div>
        )}
      </CardContent>
    </div>
  );
};