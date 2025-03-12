import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { useNotifications } from "@/common/Notifications";
import { useDeleteQuiz } from "../api/delete-quiz";

type DeleteQuizProps = {
  id: number;
};

export const DeleteQuiz = ({ id }: DeleteQuizProps) => {
  const { addNotification } = useNotifications();
  const deleteQuizMutation = useDeleteQuiz({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Quiz Deleted",
        });
      },
    },
  });

  return (
    <ConfirmationDialog
      isDone={deleteQuizMutation.isSuccess || deleteQuizMutation.isError}
      icon="danger"
      title="Delete Quiz"
      body="Are you sure you want to delete this quiz?"
      triggerButton={
        <Button variant="destructive" className="rounded-sm">
          Delete
        </Button>
      }
      confirmButton={
        <Button
          isPending={deleteQuizMutation.isPending}
          type="button"
          variant="destructive"
          onClick={() => {
            deleteQuizMutation.mutate({ quizId: id });
          }}
        >
          Delete Quiz
        </Button>
      }
    />
  );
};
