import { useNotifications } from "@/common/Notifications";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui";
import { Trash2 } from "lucide-react";
import { useDeleteQuestionLanguage } from "../api/delete-question-language";
import { LiftedButton } from "@/common/LiftedButton";

type DeleteLanguageProps = {
  id: number;
};
export const DeleteQuestionLanguage = ({ id }: DeleteLanguageProps) => {
  const { addNotification } = useNotifications();
  const deleteQuestionLanguageMutation = useDeleteQuestionLanguage({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Question Language Deleted",
        });
      },
    },
  });

  return (
    <ConfirmationDialog
      isDone={deleteQuestionLanguageMutation.isSuccess}
      icon="danger"
      title="Delete Question Language"
      body="This action cannot be undone."
      triggerButton={
        <LiftedButton variant="icon" className="rounded-xl bg-red-400">
          <Trash2 size={16} />
        </LiftedButton>
      }
      confirmButton={
        <Button
          isPending={deleteQuestionLanguageMutation.isPending}
          type="button"
          variant="destructive"
          onClick={() => {
            deleteQuestionLanguageMutation.mutate({ languageId: id });
          }}
        >
          Delete Language
        </Button>
      }
    />
  );
};
