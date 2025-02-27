import React from "react";
import { useNavigate } from "react-router-dom";
import { useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, Input, Label } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { CategorySelect } from "../../Question/Entities/Categories/Components/select-question-category";
import { DifficultySelect } from "../../Question/Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../../Question/Entities/Language/components/select-question-language";
import { SelectQuestions } from "../../Question/Components/select-questions";
import { createQuizInputSchema, useCreateQuiz } from "../api/create-quiz";
import {
  Question,
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/ApiTypes";
import { useQuestionData } from "../../Question/api/get-questions";
import { useQuestionLangaugeData } from "../../Question/Entities/Language/api/get-question-language";
import { useQuestionDifficultyData } from "../../Question/Entities/Difficulty/api/get-question-difficulties";
import { useQuestionCategoryData } from "../../Question/Entities/Categories/api/get-question-categories";

export const CreateQuizForm = () => {
  const navigate = useNavigate();

  const questionCategoriesQuery = useQuestionCategoryData({});
  const questionDifficultiesQuery = useQuestionDifficultyData({});
  const questionLanguagesQuery = useQuestionLangaugeData({});

  const { data, isLoading, error } = useQuestionData({});

  const createQuizMutation = useCreateQuiz({
    mutationConfig: {
      onSuccess: () => {
        navigate("/quizzes");
      },
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading questions</div>;
  }

  const existingQuestions = data?.items;

  console.log(existingQuestions);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Create a New Quiz</h1>
      <Form
        id="create-quiz"
        onSubmit={(values) => {
          createQuizMutation.mutate({ data: values });
        }}
        schema={createQuizInputSchema}
        options={{ mode: "onSubmit" }}
      >
        {({ register, control, formState, setValue, watch, clearErrors }) => {
          const {
            fields: publicFields,
            append: appendPublic,
            remove: removePublic,
          } = useFieldArray({
            control,
            name: "publicQuestions",
          });
          const {
            fields: privateFields,
            append: appendPrivate,
            remove: removePrivate,
          } = useFieldArray({
            control,
            name: "privateQuestions",
          });

          return (
            <div id="create-quiz-form" className="space-y-8">
              {/* Quiz Details */}
              <div>
                <h2 className="text-2xl font-semibold mb-4">Quiz Details</h2>
                <div className="mb-4">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter quiz title"
                    registration={register("title")}
                    error={formState.errors.title}
                  />
                </div>
                <div className="mb-4">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Enter quiz description"
                    registration={register("description")}
                    error={formState.errors.description}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                    <Input
                      id="timeLimit"
                      type="number"
                      registration={register("timeLimit", {
                        valueAsNumber: true,
                      })}
                      error={formState.errors.timeLimit}
                    />
                  </div>
                  <div>
                    <Label htmlFor="passingScore">Passing Score</Label>
                    <Input
                      id="passingScore"
                      type="number"
                      registration={register("passingScore", {
                        valueAsNumber: true,
                      })}
                      error={formState.errors.passingScore}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <CategorySelect
                    label="Category"
                    categories={questionCategoriesQuery.data || []}
                    value={watch("category")}
                    onChange={(val) => setValue("category", val)}
                    error={formState.errors.category?.message}
                    clearErrors={() => clearErrors("category")}
                  />
                  <LanguageSelect
                    label="Language"
                    languages={questionLanguagesQuery.data || []}
                    value={watch("language")}
                    onChange={(val) => setValue("language", val)}
                    error={formState.errors.language?.message}
                    clearErrors={() => clearErrors("language")}
                  />
                </div>
              </div>

              <Separator className="my-6" />

              {/* Public Questions Section */}
              <div>
                <h2 className="text-2xl font-semibold mb-4">
                  Public Questions
                </h2>
                {publicFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-4 mb-4 border p-4 rounded"
                  >
                    <div className="flex-1">
                      <SelectQuestions
                        selected={watch(`publicQuestions.${index}.questionId`)}
                        onSelect={(question: Question) =>
                          setValue(
                            `publicQuestions.${index}.questionId`,
                            question.id
                          )
                        }
                        error={
                          formState.errors.publicQuestions?.[index]?.questionId
                            ?.message
                        }
                        existingQuestions={data?.items ?? []}
                      />
                    </div>
                    <div className="w-24">
                      <Label htmlFor={`publicScore-${index}`}>Score</Label>
                      <Input
                        id={`publicScore-${index}`}
                        type="number"
                        registration={register(
                          `publicQuestions.${index}.score`,
                          { valueAsNumber: true }
                        )}
                        error={formState.errors.publicQuestions?.[index]?.score}
                      />
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => removePublic(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  variant="addSave"
                  onClick={() => appendPublic({ questionId: 0, score: 1 })}
                >
                  + Add Public Question
                </Button>
              </div>

              <Separator className="my-6" />

              {/* Private Questions Section */}
              <div>
                <h2 className="text-2xl font-semibold mb-4">
                  Private Questions
                </h2>
                {privateFields.map((field, index) => (
                  <PrivateQuestionForm
                    key={field.id}
                    index={index}
                    control={control}
                    register={register}
                    formState={formState}
                    setValue={setValue}
                    watch={watch}
                    clearErrors={clearErrors}
                    difficulties={questionDifficultiesQuery.data || []}
                    categories={questionCategoriesQuery.data || []}
                    languages={questionLanguagesQuery.data || []}
                    removeQuestion={() => removePrivate(index)}
                  />
                ))}
                <Button
                  variant="addSave"
                  onClick={() =>
                    appendPrivate({
                      text: "",
                      difficulty: "",
                      language: "",
                      category: "",
                      answerOptions: [],
                      score: 1,
                    })
                  }
                >
                  + Add Private Question
                </Button>
              </div>

              <Separator className="my-6" />

              <Button
                type="submit"
                variant="addSave"
                disabled={createQuizMutation.isPending}
              >
                {createQuizMutation.isPending ? "Submitting..." : "Submit Quiz"}
              </Button>
            </div>
          );
        }}
      </Form>
    </div>
  );
};

export default CreateQuizForm;

/* ------------------------------
   PrivateQuestionForm Component
------------------------------- */
type PrivateQuestionFormProps = {
  index: number;
  control: any;
  register: any;
  formState: any;
  setValue: any;
  watch: any;
  clearErrors: any;
  difficulties: QuestionDifficulty[];
  categories: QuestionCategory[];
  languages: QuestionLanguage[];
  removeQuestion: () => void;
};

const PrivateQuestionForm: React.FC<PrivateQuestionFormProps> = ({
  index,
  control,
  register,
  formState,
  setValue,
  watch,
  clearErrors,
  difficulties,
  categories,
  languages,
  removeQuestion,
}) => {
  const {
    fields: answerOptionFields,
    append: appendAnswer,
    remove: removeAnswer,
  } = useFieldArray({
    control,
    name: `privateQuestions.${index}.answerOptions`,
  });

  // Auto-add two default answer options if none exist
  React.useEffect(() => {
    if (answerOptionFields.length === 0) {
      appendAnswer({ text: "", isCorrect: false });
      appendAnswer({ text: "", isCorrect: false });
    }
  }, [appendAnswer, answerOptionFields.length]);

  // Ensure only one answer option is marked as correct
  const handleCorrectChange = (aIndex: number) => {
    answerOptionFields.forEach((_, i) => {
      setValue(
        `privateQuestions.${index}.answerOptions.${i}.isCorrect`,
        i === aIndex
      );
    });
    if (answerOptionFields.some((_, i) => i === aIndex)) {
      clearErrors(`privateQuestions.${index}.answerOptions`);
    }
  };

  return (
    <div className="border p-4 mb-6 rounded">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">Private Question {index + 1}</h3>
        <Button variant="destructive" onClick={removeQuestion}>
          Remove
        </Button>
      </div>
      <div className="mb-4">
        <Label htmlFor={`privateQuestions.${index}.text`}>Question Text</Label>
        <Input
          id={`privateQuestions.${index}.text`}
          placeholder="Enter question text"
          registration={register(`privateQuestions.${index}.text`)}
          error={formState.errors.privateQuestions?.[index]?.text}
        />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <DifficultySelect
          label="Difficulty"
          difficulties={difficulties}
          value={watch(`privateQuestions.${index}.difficulty`)}
          onChange={(val) =>
            setValue(`privateQuestions.${index}.difficulty`, val)
          }
          error={
            formState.errors.privateQuestions?.[index]?.difficulty?.message
          }
          clearErrors={() =>
            clearErrors(`privateQuestions.${index}.difficulty`)
          }
        />
        <CategorySelect
          label="Category"
          categories={categories}
          value={watch(`privateQuestions.${index}.category`)}
          onChange={(val) =>
            setValue(`privateQuestions.${index}.category`, val)
          }
          error={formState.errors.privateQuestions?.[index]?.category?.message}
          clearErrors={() => clearErrors(`privateQuestions.${index}.category`)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <LanguageSelect
          label="Language"
          languages={languages}
          value={watch(`privateQuestions.${index}.language`)}
          onChange={(val) =>
            setValue(`privateQuestions.${index}.language`, val)
          }
          error={formState.errors.privateQuestions?.[index]?.language?.message}
          clearErrors={() => clearErrors(`privateQuestions.${index}.language`)}
        />
        <div>
          <Label htmlFor={`privateQuestions.${index}.score`}>Score</Label>
          <Input
            id={`privateQuestions.${index}.score`}
            type="number"
            registration={register(`privateQuestions.${index}.score`, {
              valueAsNumber: true,
            })}
            error={formState.errors.privateQuestions?.[index]?.score}
          />
        </div>
      </div>
      <Separator className="my-4" />
      <div>
        <h4 className="font-medium mb-2">Answer Options</h4>
        {answerOptionFields.map((answerField, aIndex) => {
          const isCorrect = watch(
            `privateQuestions.${index}.answerOptions.${aIndex}.isCorrect`
          );
          return (
            <div
              key={answerField.id}
              className="flex items-center gap-4 mb-2 rounded p-2 border"
            >
              <Input
                placeholder={`Answer Option ${aIndex + 1}`}
                registration={register(
                  `privateQuestions.${index}.answerOptions.${aIndex}.text`
                )}
                error={
                  formState.errors.privateQuestions?.[index]?.answerOptions?.[
                    aIndex
                  ]?.text
                }
                className={`${isCorrect ? "border-2 border-green-500" : ""}`}
              />
              <div className="flex flex-col items-center">
                <input
                  type="checkbox"
                  checked={isCorrect}
                  onChange={() => handleCorrectChange(aIndex)}
                />
                <Label className="text-xs mt-1">Correct</Label>
              </div>
              <Button
                variant="destructive"
                onClick={() => removeAnswer(aIndex)}
                disabled={answerOptionFields.length <= 2}
              >
                Remove
              </Button>
            </div>
          );
        })}
        {formState.errors.privateQuestions?.[index]?.answerOptions && (
          <p className="text-red-500 text-sm">
            {formState.errors.privateQuestions?.[index]?.answerOptions
              ?.message || "One option must be marked as correct."}
          </p>
        )}
        <Button
          variant="addSave"
          onClick={() => appendAnswer({ text: "", isCorrect: false })}
          disabled={answerOptionFields.length >= 4}
        >
          + Add Answer Option
        </Button>
      </div>
    </div>
  );
};
