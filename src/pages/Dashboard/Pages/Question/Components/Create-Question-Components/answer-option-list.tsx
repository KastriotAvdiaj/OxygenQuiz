import React, { useEffect } from "react";
import { useFieldArray, UseFormClearErrors } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/form";
import { AnswerOption } from "./answer-option";
import { CreateQuizInput } from "../../../Quiz/api/create-quiz";

interface AnswerOptionListProps {
  control: any;
  register: any;
  formState: any;
  watch: any;
  setValue: any;
  clearErrors: UseFormClearErrors<CreateQuizInput>;
  name?: string;
}

export const AnswerOptionList: React.FC<AnswerOptionListProps> = ({
  control,
  register,
  formState,
  watch,
  setValue,
  clearErrors,
  name = "answerOptions",
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  useEffect(() => {
    console.log("hello");
    if (fields.length === 0) {
      append({ text: "", isCorrect: false });
      append({ text: "", isCorrect: false });
    }
  }, []);

  const handleCorrectToggle = (index: number) => {
    fields.forEach((_, i) => {
      setValue(`${name}.${i}.isCorrect`, i === index);
    });
    clearErrors();
  };

  return (
    <div className="space-y-4">
      <Label className="block text-sm font-medium text-foreground mb-2">
        Answer Options
      </Label>
      {fields.map((field, index) => (
        <AnswerOption
          key={field.id}
          index={index}
          textRegistration={register(`${name}.${index}.text`)}
          isCorrect={!!watch(`${name}.${index}.isCorrect`)}
          onCorrectToggle={() => handleCorrectToggle(index)}
          error={formState.errors?.[name]?.[index]?.text?.message}
          onRemove={() => remove(index)}
          disableRemove={fields.length <= 2}
        />
      ))}
      <Button
        variant="addSave"
        type="button"
        size="sm"
        onClick={() => append({ text: "", isCorrect: false })}
        disabled={fields.length >= 4}
        className="mt-2 rounded-sm"
      >
        + Add Answer Option
      </Button>
    </div>
  );
};
