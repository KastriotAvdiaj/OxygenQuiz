import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/form";
import { Question } from "@/types/ApiTypes";
import { Button } from "@/components/ui";
import { DeleteQuestion } from "./delete-question";
import { Link } from "react-router-dom";
import { AnswerOptionViewList } from "./answer-option-view-list";
import { EditIcon } from "lucide-react";

interface NormalQuestionCard {
  question: Question;
}

export const NormalQuestionCard: React.FC<NormalQuestionCard> = ({
  question,
}) => {
  return (
    <Card className="w-full border border-border rounded-lg bg-background overflow-hidden transition-shadow duration-200 shadow hover:shadow-lg">
      <Link to={`/dashboard/questions/${question.id}`}>
        <div className="flex flex-col sm:flex-row items-start justify-between p-4">
          <div className="flex-grow mb-2 sm:mb-0">
            <h5 className="text-base font-semibold">{question.text}</h5>
            <Label className="text-xs text-gray-500">{question.category}</Label>
          </div>
          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2">
            <Badge className="border-1px">{question.difficulty}</Badge>
          </div>
        </div>
        <div className="transition-all duration-200 ease-in-out">
          <CardContent className="pt-0 pb-4">
            <AnswerOptionViewList answerOptions={question.answerOptions} />
          </CardContent>
        </div>
      </Link>
      <section className="border-t border-border p-2 flex items-center gap-2 justify-end opacity-100 sm:opacity-0 sm:hover:opacity-100 transition-opacity duration-200">
        <Button size="sm" className="rounded-sm">
          <EditIcon size={16} />
        </Button>
        <DeleteQuestion id={question.id} />
      </section>
    </Card>
  );
};
