// import { useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { FormProps } from "../types";
import {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/ApiTypes";
import { AnswerOptionList } from "@/pages/Dashboard/Pages/Question/Components/Create-Question-Components/answer-option-list";
import { Trash2 } from "lucide-react";
import { ScoreSelect } from "./score-select";

interface PrivateQuestionFormProps {
  index: number;
  formProps: FormProps;
  difficulties: QuestionDifficulty[];
  categories: QuestionCategory[];
  languages: QuestionLanguage[];
  removeQuestion: () => void;
}

export const PrivateQuestionForm = ({
  index,
  formProps,
  removeQuestion,
}: PrivateQuestionFormProps) => {
  const { register, control, formState, setValue, watch, clearErrors } =
    formProps;

  // const {
  //   fields: answerFields,
  //   append: appendAnswer,
  //   remove: removeAnswer,
  // } = useFieldArray({
  //   control,
  //   name: `privateQuestions.${index}.answerOptions`,
  // });

  return (
    <div className="p-4 rounded bg-muted max-w-2xl">
      <div className="flex justify-between items-center ">
        <h3 className="text-xl font-semibold">Question {index + 1}</h3>
        <Button variant="destructive" onClick={removeQuestion}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Question Text */}
      <div className="my-4 font-header">
        <Input
          variant="quiz"
          placeholder={`Type Your Question`}
          id={`question-${index}`}
          {...register(`privateQuestions.${index}.text`)}
          error={formState.errors.privateQuestions?.[index]?.text}
        />
      </div>

      {/* Metadata Row */}
      <div className="flex flex-col">
      <div>
          <Label htmlFor={`score-${index}`}>Score</Label>
          <ScoreSelect
            control={control}
            name={`privateQuestions.${index}.score`}
            error={formState.errors.privateQuestions?.[index]?.score}
            id={`score-${index}`}
          />
        </div>
      </div>

      <Separator className="my-4" />
      <AnswerOptionList
        control={control}
        register={register}
        formState={formState}
        watch={watch}
        setValue={setValue}
        clearErrors={clearErrors}
        name="privateQuestions"
        // name={`privateQuestions.${index}.answerOptions`}
      />

      {/* Answer Options */}
      {/* <div className="space-y-4">
        <h4 className="font-semibold">Answer Options</h4>
        {answerFields.map((field, answerIndex) => (
          <div key={field.id} className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                {...register(
                  `privateQuestions.${index}.answerOptions.${answerIndex}.text`
                )}
                placeholder="Answer text"
                error={
                  formState.errors.privateQuestions?.[index]?.answerOptions?.[
                    answerIndex
                  ]?.text
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register(
                  `privateQuestions.${index}.answerOptions.${answerIndex}.isCorrect`
                )}
                className="w-4 h-4"
              />
              <Label>Correct</Label>
            </div>
            <Button
              variant="destructive"
              onClick={() => removeAnswer(answerIndex)}
              disabled={answerFields.length <= 2}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => appendAnswer({ text: "", isCorrect: false })}
          disabled={answerFields.length >= 4}
        >
          Add Answer Option
        </Button>
      </div> */}
    </div>
  );
};
