import { Button } from "@/components/ui/button";
import { SelectQuestions } from "../../../../Question/Components/select-questions";
import { Input, Label } from "@/components/ui/form";
import { FormProps } from "../types";
import { Question } from "@/types/ApiTypes";
import { useFieldArray } from "react-hook-form";
import { Card } from "@/components/ui";

interface PublicQuestionsProps {
  formProps: FormProps;
  questions: Question[];
}

export const PublicQuestions = ({
  formProps,
  questions,
}: PublicQuestionsProps) => {
  const { register, control, formState, setValue, watch } = formProps;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "publicQuestions",
  });

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4 ">Public Questions</h2>
      {fields.map((field, index) => (
        <Card
          key={field.id}
          className="flex items-center gap-4 mb-4 p-4 rounded bg-muted"
        >
          <div className="flex-1">
            <SelectQuestions
              selected={watch(`publicQuestions.${index}.questionId`)}
              onSelect={(question: Question) =>
                setValue(`publicQuestions.${index}.questionId`, question.id)
              }
              error={
                formState.errors.publicQuestions?.[index]?.questionId?.message
              }
              existingQuestions={questions}
            />
          </div>
          <div className="w-24">
            <Label htmlFor={`publicScore-${index}`}>Score</Label>
            <Input
              id={`publicScore-${index}`}
              type="number"
              registration={register(`publicQuestions.${index}.score`, {
                valueAsNumber: true,
              })}
              error={formState.errors.publicQuestions?.[index]?.score}
            />
          </div>
          <Button variant="destructive" onClick={() => remove(index)}>
            Remove
          </Button>
        </Card>
      ))}
      <Button
        type="button"
        variant="addSave"
        onClick={() => append({ questionId: 0, score: 1 })}
      >
        + Add Public Question
      </Button>
    </div>
  );
};
