import { useFieldArray } from 'react-hook-form'; 
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/form'; 
import { Separator } from '@/components/ui/separator';
import { FormProps } from '../types';
import {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from '@/types/ApiTypes';
import { AnswerOption } from "@/pages/Dashboard/Pages/Question/Components/Create-Question-Components/answer-option"; 
import { Medal, Trash2 } from 'lucide-react';
import { ScoreSelect } from './score-select'; 

interface PrivateQuestionFormProps {
  index: number;
  formProps: FormProps;
  difficulties: QuestionDifficulty[]
  categories: QuestionCategory[];
  languages: QuestionLanguage[];
  removeQuestion: () => void;
}

export const PrivateQuestionForm = ({
  index,
  formProps,
  // difficulties, // Pass down if needed for selects here
  // categories,
  // languages,
  removeQuestion,
}: PrivateQuestionFormProps) => {
  const { register, control, formState, setValue, watch, clearErrors } = formProps;

  // --- Nested Field Array for Answer Options ---
  const answerOptionsName = `privateQuestions.${index}.answerOptions` as const; // Define name clearly
  const {
    fields: answerOptionFields,
    append: appendAnswerOption,
    remove: removeAnswerOption
  } = useFieldArray({
    control: control, // Use the control object passed down
    name: answerOptionsName, // *** Use the correct dynamic name ***
  });
  // --- End Nested Field Array ---

  // Handler to ensure only one correct answer
  const handleCorrectToggle = (optionIndex: number) => {
    answerOptionFields.forEach((_, i) => {
      setValue(`${answerOptionsName}.${i}.isCorrect`, i === optionIndex, {
         shouldValidate: true // Optionally trigger validation
      });
    });
    clearErrors(`${answerOptionsName}`);
  };

  const maxAnswers = 4;
  const canAddMoreAnswers = answerOptionFields.length < maxAnswers;

  const handleAddAnswerOption = () => {
    if (canAddMoreAnswers) {
      appendAnswerOption({ text: "", isCorrect: false }); 
    }
  };

  return (
    <div className="p-4 rounded bg-muted max-w-2xl border border-border"> 
      <div className="flex justify-between items-center mb-4"> {/* Added mb-4 */}
        <h3 className="text-xl font-semibold">Question {index + 1}</h3>
        <Button variant="destructive" size="icon" onClick={removeQuestion}> {/* Make button smaller */}
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Question Text */}
      <div className="mb-4 font-header"> {/* Reduced margin */}
        <Label htmlFor={`privateQuestions.${index}.text`} className="sr-only">Question Text</Label> {/* Added Label */}
        <Input
          variant="quiz"
          placeholder={`Type Your Question`}
          id={`privateQuestions.${index}.text`} // Use unique ID based on field name
          {...register(`privateQuestions.${index}.text`)}
          error={formState.errors.privateQuestions?.[index]?.text}
        />
      </div>

      {/* Score Select */}
      <div className="mb-4"> {/* Added mb-4 */}
        <div className="flex flex-col gap-2">
          <Label htmlFor={`privateQuestions.${index}.score`} className="flex items-center gap-2 text-lg"> {/* Use correct name for ID */}
            <Medal size={20} /> Points (Time)
          </Label>
          <ScoreSelect
            control={control}
            name={`privateQuestions.${index}.score`}
            error={formState.errors.privateQuestions?.[index]?.score}
            id={`privateQuestions.${index}.score`} 
          />
        </div>
      </div>

      <Separator className="my-4" />
      <div className="space-y-4">
        <Label className="block text-sm font-medium text-foreground mb-2">
          Answer Options (Select correct answer)
        </Label>
        {answerOptionFields.map((field, optionIndex) => (
          <AnswerOption
            key={field.id} 
            index={optionIndex}
            textRegistration={register(`${answerOptionsName}.${optionIndex}.text`)}
            isCorrect={!!watch(`${answerOptionsName}.${optionIndex}.isCorrect`)}
            onCorrectToggle={() => handleCorrectToggle(optionIndex)}
            error={formState.errors.privateQuestions?.[index]?.answerOptions?.[optionIndex]?.text}
            onRemove={() => removeAnswerOption(optionIndex)}
            disableRemove={answerOptionFields.length <= 2}
          />
        ))}
      </div>


      <Button
        variant="addSave"
        type="button"
        size="sm"
        onClick={handleAddAnswerOption}
        disabled={!canAddMoreAnswers}
        className="mt-4 rounded-sm" 
      >
        + Add Answer Option
      </Button>
       {!canAddMoreAnswers && <p className="text-sm text-muted-foreground mt-1">Maximum {maxAnswers} options reached.</p>}
    </div>
  );
};