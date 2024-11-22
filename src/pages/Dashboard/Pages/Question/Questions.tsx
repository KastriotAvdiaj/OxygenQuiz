import { Button } from "@/components/ui/button";
import { FormDrawer } from "@/components/ui/form";
import { NewQuestion } from "./Components/create-question";
import { Plus } from "lucide-react";
import { Question } from "@/types/ApiTypes";
import { QuestionCard } from "@/common/Question-Ui/question-card";

export const Questions = () => {

  const sampleQuestion: Question = {
    id: 2,
    question: "What is the capital of France?",
    difficulty: 2,
    difficultyDisplay: "Hard",
    answerOptions: [
      { id: 1, text: "Paris", isCorrect: true },
      { id: 2, text: "Berlin", isCorrect: false },
    ],
  };

  return (
    <div>
      <FormDrawer
      isDone={false}
      triggerButton={
        <Button
          variant="addSave"
          className="bg-text-hover rounded-sm"
          size="sm"
          icon={<Plus className="size-4" />}
        >
          Create Question
        </Button>
      }
      title="Create Question"
      submitButton={
        <Button
          form="create-user"
          variant="addSave"
          className="rounded-sm"
          type="submit"
          size="default"
          isPending={false}
          disabled={false}
        >
          Submit
        </Button>
      }
    >
      <NewQuestion />
    </FormDrawer>
     <QuestionCard question={sampleQuestion} />
    </div>
  );
};
