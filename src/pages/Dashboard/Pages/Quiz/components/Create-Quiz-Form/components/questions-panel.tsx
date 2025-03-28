import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
interface CreatedQuestionsPanelProps {
  // These could be the fields arrays from your react-hook-form useFieldArray hooks.
  //   publicQuestions: any[];
  //   privateQuestions: any[];
  //   onRemovePublic: (index: number) => void;
  //   onRemovePrivate: (index: number) => void;
  //   onEditQuestion: (type: "public" | "private", index: number) => void;
  //   onAddNew: () => void;
  privateQuestionButton: JSX.Element;
  publicQuestionButton: JSX.Element;
}

export const CreatedQuestionsPanel: React.FC<CreatedQuestionsPanelProps> = ({
  //   publicQuestions,
  //   privateQuestions,
  //   onRemovePublic,
  //   onRemovePrivate,
  //   onEditQuestion,
  //   onAddNew,
  privateQuestionButton,
  publicQuestionButton,
}) => {
  return (
    <Card className="w-64 shadow-none border-none">
      <CardHeader className="border-b-2 border-muted">
        <CardTitle>Quiz Questions</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant={"fancy"}>
              Add Question
            </Button>
          </PopoverTrigger>
          <PopoverContent side="left">
            <div className="flex flex-col gap-4">
              {privateQuestionButton}
              {publicQuestionButton}
            </div>
          </PopoverContent>
        </Popover>
      </CardContent>
    </Card>
  );
};
