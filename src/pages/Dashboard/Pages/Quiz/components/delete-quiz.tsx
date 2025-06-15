import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { useNotifications } from "@/common/Notifications";
import { useDeleteQuiz } from "../api/delete-quiz";
import { Trash2 } from "lucide-react";

type DeleteQuizProps = {
  id: number;
  finished: () => void;
};

export const DeleteQuiz = ({ id, finished }: DeleteQuizProps) => {
  const { addNotification } = useNotifications();
  const deleteQuizMutation = useDeleteQuiz({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Quiz Deleted",
        });
        finished();
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
        <Button variant="userMenu" className="h-5 font-normal px-0 flex w-full">
          <Trash2 size={16} /> Delete
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
