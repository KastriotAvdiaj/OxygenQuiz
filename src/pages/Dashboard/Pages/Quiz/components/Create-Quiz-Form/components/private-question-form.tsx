import { useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
// import { CategorySelect } from "../../../../Question/Entities/Categories/Components/select-question-category";
import { DifficultySelect } from "../../../../Question/Entities/Difficulty/Components/select-question-difficulty";
// import { LanguageSelect } from "../../../../Question/Entities/Language/components/select-question-language";
import { FormProps } from "../types";
import {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/ApiTypes";

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
  difficulties,
  // categories,
  // languages,
  removeQuestion,
}: PrivateQuestionFormProps) => {
  const { register, control, formState, setValue, watch, clearErrors } =
    formProps;

  const {
    fields: answerFields,
    append: appendAnswer,
    remove: removeAnswer,
  } = useFieldArray({
    control,
    name: `privateQuestions.${index}.answerOptions`,
  });

  return (
    <div className="p-4 rounded bg-muted max-w-2xl">
      <div className="flex justify-between items-center ">
        <h3 className="text-xl font-semibold">Question {index + 1}</h3>
        <Button variant="destructive" onClick={removeQuestion}>
          Remove Question
        </Button>
      </div>

      {/* Question Text */}
      <div className="mb-4 font-header">
        <Label htmlFor={`question-${index}`}>Question Text</Label>
        <Input
        variant="quiz"
          id={`question-${index}`}
          {...register(`privateQuestions.${index}.text`)}
          error={formState.errors.privateQuestions?.[index]?.text}
        />
      </div>

      {/* Metadata Row */}
      <div className="flex flex-col">
        {/* <CategorySelect
          label="Category"
          categories={categories}
          value={
            watch(`privateQuestions.${index}.categoryId`)?.toString() || ""
          }
          onChange={(selectedValue: string) =>
            setValue(
              `privateQuestions.${index}.categoryId`,
              parseInt(selectedValue, 10)
            )
          }
          includeAllOption={false}
          error={
            formState.errors.privateQuestions?.[index]?.categoryId?.message
          }
          clearErrors={() =>
            clearErrors(`privateQuestions.${index}.categoryId`)
          }
        /> */}

        <DifficultySelect
          label="Difficulty"
          difficulties={difficulties}
          value={
            watch(`privateQuestions.${index}.difficultyId`)?.toString() || ""
          }
          onChange={(selectedValue: string) =>
            setValue(
              `privateQuestions.${index}.difficultyId`,
              parseInt(selectedValue, 10)
            )
          }
          includeAllOption={false}
          error={
            formState.errors.privateQuestions?.[index]?.difficultyId?.message
          }
          clearErrors={() =>
            clearErrors(`privateQuestions.${index}.difficultyId`)
          }
        />

        {/* <LanguageSelect
          label="Language"
          languages={languages}
          value={
            watch(`privateQuestions.${index}.languageId`)?.toString() || ""
          }
          onChange={(selectedValue: string) =>
            setValue(
              `privateQuestions.${index}.languageId`,
              parseInt(selectedValue, 10)
            )
          }
          includeAllOption={false}
          error={
            formState.errors.privateQuestions?.[index]?.languageId?.message
          }
          clearErrors={() =>
            clearErrors(`privateQuestions.${index}.languageId`)
          }
        /> */}
        <div>
          <Label htmlFor={`score-${index}`}>Score</Label>
          <Input
            id={`score-${index}`}
            type="number"
            {...register(`privateQuestions.${index}.score`, {
              valueAsNumber: true,
            })}
            error={formState.errors.privateQuestions?.[index]?.score}
          />
        </div>
      </div>

      <Separator className="my-4" />

      {/* Answer Options */}
      <div className="space-y-4">
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
      </div>
    </div>
  );
};
