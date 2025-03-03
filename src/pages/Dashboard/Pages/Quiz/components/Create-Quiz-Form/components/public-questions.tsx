import { Button } from "@/components/ui/button";
import { SelectQuestions } from "../../../../Question/Components/select-questions";
import { Input, Label } from "@/components/ui/form";
import { FormProps } from "../types";
import { Question } from "@/types/ApiTypes";
import { useFieldArray } from "react-hook-form";
import {
  Card,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { Info, Trash } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
          className="flex items-center gap-4 mb-4 p-4 border-none rounded bg-muted min-h-[100px]"
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
          <Separator
            orientation="vertical"
            className="bg-border h-[80px] bg-foreground/40"
          />
          <section className="flex flex-col items-center gap-4 justify-center">
            <div className="w-24">
              <div className="flex items-center space-x-2">
                <Label htmlFor={`publicScore-${index}`}>Score</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={16} />
                    </TooltipTrigger>
                    <TooltipContent className="bg-background">
                      <p className="text-center">
                        This score indicates the value or weight of the question
                        in the quiz.
                        <br />
                        (X/100).
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id={`publicScore-${index}`}
                type="number"
                registration={register(`publicQuestions.${index}.score`, {
                  valueAsNumber: true,
                })}
                error={formState.errors.publicQuestions?.[index]?.score}
              />
            </div>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => remove(index)}
            >
              <Trash size={14} />
            </Button>
          </section>
        </Card>
      ))}
      <Button
        type="button"
        variant="default"
        onClick={() => append({ questionId: 0, score: 1 })}
      >
        + Add Public Question
      </Button>
    </div>
  );
};
