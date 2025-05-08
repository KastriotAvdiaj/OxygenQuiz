import { useNotifications } from "@/common/Notifications";
import { FormDrawer } from "@/components/ui/form";
import { Button } from "@/components/ui";
import { Input, Label } from "@/components/ui/form";
import { Form } from "@/components/ui/form";
import { createQuestionLanguageInputSchema } from "../api/create-question-language";
import { useCreateQuestionLanguage } from "../api/create-question-language";
import { LiftedButton } from "@/common/LiftedButton";

export const CreateQuestionLanguageForm = () => {
  const { addNotification } = useNotifications();
  const createQuestionLanguageMutation = useCreateQuestionLanguage({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Question Language Created",
        });
      },
    },
  });

  return (
    <FormDrawer
      isDone={createQuestionLanguageMutation.isSuccess}
      triggerButton={
        <LiftedButton className="text-xs">+ New Language</LiftedButton>
      }
      title="Create New Question Language"
      submitButton={
        <Button
          form="create-question-language"
          variant="addSave"
          className="rounded-sm text-white"
          type="submit"
          size="default"
          isPending={createQuestionLanguageMutation.isPending}
          disabled={createQuestionLanguageMutation.isPending}
        >
          Submit
        </Button>
      }
    >
      <Form
        id="create-question-language"
        onSubmit={(values) => {
          createQuestionLanguageMutation.mutate({ data: values });
        }}
        schema={createQuestionLanguageInputSchema}
      >
        {({ register, formState }) => {
          return (
            <>
              <div>
                <Label htmlFor="language" className="text-sm font-medium">
                  Language
                </Label>
                <Input
                  id="level"
                  className={`py-2 ${
                    formState.errors["language"]
                      ? "border-red-500"
                      : "border-border"
                  }`}
                  placeholder="Enter new langauge here..."
                  error={formState.errors["language"]}
                  registration={register("language")}
                />
              </div>
            </>
          );
        }}
      </Form>
    </FormDrawer>
  );
};

export default CreateQuestionLanguageForm;
