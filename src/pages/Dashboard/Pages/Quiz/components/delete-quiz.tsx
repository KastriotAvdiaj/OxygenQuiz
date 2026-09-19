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
  /**
   * Controlled mode. Pass these to render the confirm dialog on its own (no
   * trigger) from OUTSIDE a dropdown menu, so closing the menu — or the row
   * unmounting after the list refetches — can't strand the dialog mid-close.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const DeleteQuiz = ({
  id,
  finished,
  className,
  open,
  onOpenChange,
}: DeleteQuizProps) => {
  const isControlled = open !== undefined;
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

  // Reset mutation state whenever dialog visibility changes or component re-opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      deleteQuizMutation.reset();
    }
    onOpenChange?.(newOpen);
  };

  return (
    <ConfirmationDialog
      isOpen={open}
      onOpenChange={handleOpenChange}
      isDone={deleteQuizMutation.isSuccess || deleteQuizMutation.isError}
      icon="danger"
      title="Delete Quiz"
      body="Are you sure you want to delete this quiz?"
      triggerButton={
        isControlled ? undefined : (
          <Button
            variant="userMenu"
            className={cn("h-5 font-normal px-0 flex w-full", className)}
          >
            <Trash2 size={16} /> Delete
          </Button>
        )
      }
      confirmButton={
        <LiftedButton
          isPending={deleteQuizMutation.isPending}
          type="button"
          className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 py-1"
          liftColor="red-700"
          onClick={() => {
            deleteQuizMutation.mutate({ quizId: id });
          }}
        >
          Delete Quiz
        </LiftedButton>
      }
    />
  );
};
