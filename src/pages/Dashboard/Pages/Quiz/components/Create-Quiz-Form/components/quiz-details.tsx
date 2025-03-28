import { Input, Label, Textarea } from "@/components/ui/form";
import { CategorySelect } from "../../../../Question/Entities/Categories/Components/select-question-category";
import { LanguageSelect } from "../../../../Question/Entities/Language/components/select-question-language";
import { FormProps, QueryData } from "../types";

interface QuizDetailsProps {
  formProps: FormProps;
  queryData: QueryData;
}

export const QuizDetails = ({ formProps, queryData }: QuizDetailsProps) => {
  const { register, watch, setValue, formState, clearErrors } = formProps;

  return (
    <div>
      {/* Title and Description */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <div>
          <Label htmlFor="title">Quiz Title</Label>
          <Input
            className="bg-muted rounded-sm"
            id="title"
            variant="quiz"
            {...register("title")}
            error={formState.errors.title}
            placeholder="Enter quiz title"
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            maxLength={200}
            className="bg-muted rounded-sm max-h-28"
            id="description"
            registration={register("description")}
            error={formState.errors.description}
            placeholder="Enter quiz description"
          />
        </div>
      </div>

      {/* Category and Language */}
      <div className="grid grid-cols-2 gap-4">
        <CategorySelect
          label="Category"
          categories={queryData.categories}
          value={watch("categoryId")?.toString() || ""}
          onChange={(selectedValue: string) =>
            setValue("categoryId", parseInt(selectedValue, 10))
          }
          includeAllOption={false}
          error={formState.errors["categoryId"]?.message}
          clearErrors={() => clearErrors("categoryId")}
        />

        <LanguageSelect
          label="Language"
          languages={queryData.languages}
          value={watch("languageId")?.toString() || ""}
          includeAllOption={false}
          onChange={(selectedValue: string) =>
            setValue("languageId", parseInt(selectedValue, 10))
          }
          error={formState.errors["languageId"]?.message}
          clearErrors={() => clearErrors("languageId")}
        />
      </div>
    </div>
  );
};
