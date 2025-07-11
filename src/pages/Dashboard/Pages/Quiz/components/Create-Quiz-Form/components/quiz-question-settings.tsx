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
    <div>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            <span className="truncate max-w-[200px]">
              {question.text || `Question ${settings.orderInQuiz + 1}`}
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            #{settings.orderInQuiz + 1}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Point System */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Point System</Label>
          <Select
            value={settings.pointSystem}
            onValueChange={(value) =>
              updateQuestionSetting(question.id, "pointSystem", value)
            }
          >
            <SelectTrigger variant="quiz" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POINT_SYSTEM_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-xs"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Time Limit */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Time Limit</Label>
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
            <SelectTrigger variant="quiz" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_LIMIT_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value.toString()}
                  className="text-xs"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        {showCopyActions && (
          <div className="flex gap-2 pt-2 items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetQuestionSettings(question.id)}
              className="h-7 text-xs flex-1"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>

            {addedQuestions.length > 1 && (
              <Select
                onValueChange={(value) => handleCopyFrom(parseInt(value))}
              >
                <SelectTrigger>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy From
                </SelectTrigger>
                <SelectContent>
                  {addedQuestions
                    .filter((q) => q.id !== question.id)
                    .map((q) => (
                      <SelectItem
                        key={q.id}
                        value={q.id.toString()}
                        className="text-xs"
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
