import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { useNotifications } from "@/common/Notifications";
import { useDeleteQuiz } from "../api/delete-quiz";
import { Trash2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { LiftedButton } from "@/common/LiftedButton";

type DeleteQuizProps = {
  className?: string;
  id: number;
  finished: () => void;
  useLiftedButton?: boolean;
};

export const DeleteQuiz = ({
  id,
  finished,
  className,
  useLiftedButton,
}: DeleteQuizProps) => {
  const { addNotification } = useNotifications();
  const deleteQuizMutation = useDeleteQuiz({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Quiz Deleted",
          message: "The quiz has been successfully deleted.",
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
        useLiftedButton ? (
          <LiftedButton
            className={cn(className)}
          >
            <Trash2 size={16} /> Delete
          </LiftedButton>
        ) : (
          <Button
            variant="userMenu"
            className={cn("h-5 font-normal px-0 flex w-full", className)}
          >
            <Trash2 size={16} /> Delete
          </Button>
        )
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
