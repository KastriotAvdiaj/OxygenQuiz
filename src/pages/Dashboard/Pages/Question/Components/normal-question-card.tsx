import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/form";
import { Question } from "@/types/ApiTypes";
import { Button } from "@/components/ui";
import { DeleteQuestion } from "./delete-question";
import { Link } from "react-router-dom";
import { AnswerOptionViewList } from "./answer-option-view-list";

interface NormalQuestionCard {
  question: Question;
}

export const NormalQuestionCard: React.FC<NormalQuestionCard> = ({
  question,
}) => {
  return (
    <Link to={`/dashboard/questions/${question.id}`}>
      <Card className="max-w-[300px] border border-[0.1px] bg-card rounded-lg overflow-hidden transition-shadow duration-200 shadow hover:shadow-lg">
        <div className="flex flex-col sm:flex-row items-start justify-between p-4">
          <div className="flex-grow mb-2 sm:mb-0">
            <h5 className={`text-lg font-semibold `}>{question.text}</h5>
            <Label className="text-sm text-gray-500">{question.category}</Label>
          </div>
          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2">
            <Badge className="border-1px">{question.difficulty}</Badge>
          </div>
        </div>
        <div className="transition-all duration-200 ease-in-out">
          <CardContent className="pt-0 pb-4">
            {/* <ul className="space-y-2">
              {question.answerOptions.map((option) => (
                <li
                  key={option.id}
                  className={`p-2 rounded ${
                    option.isCorrect
                      ? "bg-green-100 dark:bg-green-900"
                      : "bg-gray-100 dark:bg-gray-800"
                  }`}
                >
                  {option.text}
                  {option.isCorrect && (
                    <span className="ml-2 text-green-600 dark:text-green-400">
                      (Correct)
                    </span>
                  )}
                </li>
              ))}
            </ul> */}
            <AnswerOptionViewList answerOptions={question.answerOptions} />
            <section className="pt-2 flex items-center gap-2 justify-end">
              <Button size="sm">Edit</Button>
              <DeleteQuestion id={question.id} />
            </section>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
};
