import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { useNotifications } from "@/common/Notifications";

import { useDeleteQuestion } from "../api/delete-question";

type DeleteUserProps = {
  id: number;
};

export const DeleteQuestion = ({ id }: DeleteUserProps) => {
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
  });

  return (
    <ConfirmationDialog
      isDone={deleteQuestionMutation.isSuccess}
      icon="danger"
      title="Delete Question"
      body="Are you sure you want to delete this question?"
      triggerButton={
        <Button variant="destructive" className="rounded-sm">
          Delete
        </Button>
      }
      confirmButton={
        <Button
          isPending={deleteQuestionMutation.isPending}
          type="button"
          variant="destructive"
          onClick={() => {
            console.log("Deleting question with ID:", id);
            deleteQuestionMutation.mutate({ questionId: id });
          }}
        >
          Delete Question
        </Button>
      }
    />
  );
};
