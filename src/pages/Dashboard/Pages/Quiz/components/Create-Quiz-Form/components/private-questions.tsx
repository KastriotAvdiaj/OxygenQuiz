import { Button } from "@/components/ui/button";
import { FormProps, QueryData } from "../types";
import { useFieldArray } from "react-hook-form";
import { PrivateQuestionForm } from "./private-question-form";

interface PrivateQuestionsProps {
  formProps: FormProps;
  queryData: QueryData;
}

export const PrivateQuestions = ({
  formProps,
  queryData,
}: PrivateQuestionsProps) => {
  const { control } = formProps;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "privateQuestions",
  });

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Private Questions</h2>
      {fields.map((field, index) => (
        <PrivateQuestionForm
          key={field.id}
          index={index}
          formProps={formProps}
          difficulties={queryData.difficulties}
          categories={queryData.categories}
          languages={queryData.languages}
          removeQuestion={() => remove(index)}
        />
      ))}
      <Button
        type="button"
        variant="addSave"
        onClick={() =>
          append({
            text: "",
            difficultyId:0,
            languageId: 0,
            categoryId: 0,
            answerOptions: [],
            score: 1,
          })
        }
      >
        + Add Private Question
      </Button>
    </div>
  );
};
