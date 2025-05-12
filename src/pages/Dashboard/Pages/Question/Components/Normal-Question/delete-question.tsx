import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { useNotifications } from "@/common/Notifications";
import { useDeleteQuestion } from "../../api/delete-question";
import { QuestionType } from "@/types/ApiTypes";
import { LiftedButton } from "@/common/LiftedButton";
import { Trash } from "lucide-react";

type DeleteUserProps = {
  id: number;
  questionType: QuestionType;
};

export const DeleteQuestion = ({ id, questionType }: DeleteUserProps) => {
  const { addNotification } = useNotifications();
  const deleteQuestionMutation = useDeleteQuestion({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Question Deleted",
        });
      },
    },
    questionType,
  });

  return (
    <ConfirmationDialog
      isDone={
        deleteQuestionMutation.isSuccess || deleteQuestionMutation.isError
      }
      icon="danger"
      title="Delete Question"
      body="Are you sure you want to delete this question?"
      triggerButton={
        <LiftedButton variant="icon" className="rounded-xl bg-red-400">
          <Trash className="w-4 h-4" />
        </LiftedButton>
      }
      confirmButton={
        <Button
          isPending={deleteQuestionMutation.isPending}
          type="button"
          variant="destructive"
          onClick={() => {
            deleteQuestionMutation.mutate({ questionId: id });
          }}
        >
          Delete Question
        </Button>
      }
    />
  );
};
