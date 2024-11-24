import React, { useState } from "react";
import { Question } from "@/types/ApiTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { QuestionEditForm } from "./edit-question";
import { AnswerOptionList } from "./answer-otpion-list";

interface QuestionAdminCardProps {
  question: Question;
  // onDelete: (id: string) => void
  // onUpdate: (updatedQuestion: Question) => void
}

export const AdminQuestionCard: React.FC<QuestionAdminCardProps> = ({
  question,
  //   onDelete,
  // onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = () => setIsEditing(true);
  const handleCancelEdit = () => setIsEditing(false);
  const handleUpdate = (updatedQuestion: Question) => {
    // onUpdate(updatedQuestion)
    setIsEditing(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-green-500";
      case "medium":
        return "bg-yellow-500";
      case "hard":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto mb-6 bg-[var(--background-secondary)]">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold">
            {isEditing ? "Edit Question" : question.question}
          </CardTitle>
          <Badge
            className={`${getDifficultyColor(
              question.difficultyDisplay
            )} text-white`}
          >
            {question.difficultyDisplay}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <QuestionEditForm
            question={question}
            onUpdate={handleUpdate}
            onCancel={handleCancelEdit}
          />
        ) : (
          <>
            <AnswerOptionList options={question.answerOptions} />
            <div className="mt-6 flex justify-end space-x-2">
              <Button variant="outline" onClick={handleEdit}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button
                variant="destructive"
                // onClick={() => onDelete(question.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
