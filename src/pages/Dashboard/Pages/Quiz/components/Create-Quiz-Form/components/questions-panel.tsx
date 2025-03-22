import React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

interface CreatedQuestionsPanelProps {
  // These could be the fields arrays from your react-hook-form useFieldArray hooks.
  //   publicQuestions: any[];
  //   privateQuestions: any[];
  //   onRemovePublic: (index: number) => void;
  //   onRemovePrivate: (index: number) => void;
  //   onEditQuestion: (type: "public" | "private", index: number) => void;
  //   onAddNew: () => void;
}

export const CreatedQuestionsPanel: React.FC<CreatedQuestionsPanelProps> = (
  {
    //   publicQuestions,
    //   privateQuestions,
    //   onRemovePublic,
    //   onRemovePrivate,
    //   onEditQuestion,
    //   onAddNew,
  }
) => {
  return (
    <Card className="w-64 shadow-none border-none">
      <CardHeader className="border-b-2">
        <CardTitle>Quiz Questions</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <Button type="button" variant={"fancy"}>
          Add Question
        </Button>
      </CardContent>
    </Card>
  );
};
