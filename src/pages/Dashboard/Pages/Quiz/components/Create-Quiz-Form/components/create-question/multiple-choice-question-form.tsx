import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, HelpCircle } from "lucide-react";
import { LiftedButton } from "@/common/LiftedButton";

interface AnswerOption {
  text: string;
  isCorrect: boolean;
}

interface MultipleChoiceFormCardProps {
  className?: string;
}

export const MultipleChoiceFormCard: React.FC<MultipleChoiceFormCardProps> = ({
  className = "",
}) => {
  // State for visual demo only - no functionality
  const [questionText, setQuestionText] = useState("");
  const [allowMultipleSelections, setAllowMultipleSelections] = useState(false);
  const [answerOptions, setAnswerOptions] = useState<AnswerOption[]>([
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);

  const handleAddOption = () => {
    if (answerOptions.length < 4) {
      const newOption: AnswerOption = {
        text: "",
        isCorrect: false,
      };
      setAnswerOptions([...answerOptions, newOption]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (answerOptions.length > 2) {
      setAnswerOptions(answerOptions.filter((_, i) => i !== index));
    }
  };

  const handleAnswerTextChange = (index: number, text: string) => {
    setAnswerOptions(
      answerOptions.map((option, i) =>
        i === index ? { ...option, text } : option
      )
    );
  };

  const handleCorrectToggle = (index: number) => {
    setAnswerOptions(
      answerOptions.map((option, i) => {
        if (i === index) {
          return { ...option, isCorrect: !option.isCorrect };
        }
        // If single selection mode, uncheck others when one is selected
        if (!allowMultipleSelections && option.isCorrect) {
          return { ...option, isCorrect: false };
        }
        return option;
      })
    );
  };

  return (
    <Card className={`bg-background border-2 border-primary/30 ${className}`}>
      <CardHeader className="bg-primary/10 border-b border-primary/30">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">
            Create Multiple Choice Question
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Design your multiple choice question with customizable answer options
        </p>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {/* Question Text Input */}
        <div className="space-y-2">
          <Label htmlFor="question-text" className="text-sm font-medium">
            Question Text <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="question-text"
            placeholder="Enter your question here..."
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            className="min-h-[80px] resize-none"
          />
        </div>

        <Separator className="bg-primary/20" />

        {/* Multiple Selection Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label
              htmlFor="multiple-selections"
              className="text-sm font-medium"
            >
              Allow Multiple Correct Answers
            </Label>
            <p className="text-xs text-muted-foreground">
              Enable students to select more than one correct answer
            </p>
          </div>
          <Switch
            id="multiple-selections"
            checked={allowMultipleSelections}
            onCheckedChange={setAllowMultipleSelections}
          />
        </div>

        <Separator className="bg-primary/20" />

        {/* Answer Options Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Answer Options <span className="text-destructive">*</span>
            </Label>
            {!allowMultipleSelections && (
              <span className="text-xs text-muted-foreground italic">
                Single selection: Only one answer can be correct
              </span>
            )}
          </div>

          {/* Answer Options List */}
          <div className="space-y-3">
            {answerOptions.map((option, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  option.isCorrect
                    ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                    : "border-border bg-background"
                }`}
              >
                <div className="flex-1">
                  <Input
                    placeholder={`Answer option ${index + 1}...`}
                    value={option.text}
                    onChange={(e) =>
                      handleAnswerTextChange(index, e.target.value)
                    }
                    className={`${
                      option.isCorrect
                        ? "border-green-300 focus:border-green-500"
                        : ""
                    }`}
                  />
                </div>

                {/* Correct Answer Toggle */}
                <div className="flex flex-col items-center gap-1">
                  <Switch
                    checked={option.isCorrect}
                    onCheckedChange={() => handleCorrectToggle(index)}
                    className="shadow-sm"
                  />
                  <Label className="text-xs text-muted-foreground">
                    {allowMultipleSelections ? "Correct" : "Answer"}
                  </Label>
                </div>

                {/* Remove Option Button */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleRemoveOption(index)}
                  disabled={answerOptions.length <= 2}
                  className="h-9 w-9 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add Option Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleAddOption}
            disabled={answerOptions.length >= 4}
            className="w-full border-dashed border-primary/50 hover:bg-primary/5"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Answer Option ({answerOptions.length}/4)
          </Button>
        </div>

        <Separator className="bg-primary/20" />

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4">
          <Button variant="outline" className="px-6">
            Cancel
          </Button>
          <LiftedButton className="px-8">Create Question</LiftedButton>
        </div>
      </CardContent>
    </Card>
  );
};
