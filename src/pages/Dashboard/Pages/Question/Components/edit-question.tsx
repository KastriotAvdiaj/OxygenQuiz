import React, { useState } from "react";
import { Question } from "@/types/ApiTypes";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnswerOptionList } from "./answer-otpion-list";
interface QuestionEditFormProps {
  question: Question;
  onUpdate: (updatedQuestion: Question) => void;
  onCancel: () => void;
}

export const QuestionEditForm: React.FC<QuestionEditFormProps> = ({
  question,
  onUpdate,
  onCancel,
}) => {
  const [editedQuestion, setEditedQuestion] = useState(question);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedQuestion({ ...editedQuestion, [e.target.name]: e.target.value });
  };

  const handleDifficultyChange = (value: string) => {
    setEditedQuestion({ ...editedQuestion, difficultyDisplay: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(editedQuestion);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="question">Question</Label>
        <Input
          id="question"
          name="question"
          value={editedQuestion.text}
          onChange={handleInputChange}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="difficulty">Difficulty</Label>
        <Select
          onValueChange={handleDifficultyChange}
          defaultValue={editedQuestion.difficultyDisplay}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select difficulty" />
          </SelectTrigger>
          <SelectContent className="bg-background-secondary">
            <SelectItem value="Easy" className="hover:bg-background cursor-pointer">Easy</SelectItem>
            <SelectItem value="Medium" className="hover:bg-background cursor-pointer">Medium</SelectItem>
            <SelectItem value="Hard" className="hover:bg-background  cursor-pointer">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <AnswerOptionList
        options={editedQuestion.answerOptions}
        onUpdate={(updatedOptions) =>
          setEditedQuestion({
            ...editedQuestion,
            answerOptions: updatedOptions,
          })
        }
        isEditing
      />
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-text-hover">Save Changes</Button>
      </div>
    </form>
  );
};
