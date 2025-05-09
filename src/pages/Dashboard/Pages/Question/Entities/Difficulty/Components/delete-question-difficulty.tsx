import { useNotifications } from "@/common/Notifications";
import { useDeleteQuestionDifficulty } from "../api/delete-question-difficulty";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui";
import { Trash2 } from "lucide-react";
import { LiftedButton } from "@/common/LiftedButton";

type DeleteDifficultyProps = {
  id: number;
};
export const DeleteQuestionDifficulty = ({ id }: DeleteDifficultyProps) => {
  const { addNotification } = useNotifications();
  const deleteQuestionDifficultyMutation = useDeleteQuestionDifficulty({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Question Difficulty Deleted",
        });
      },
    },
  });

  return (
    <ConfirmationDialog
      isDone={deleteQuestionDifficultyMutation.isSuccess}
      icon="danger"
      title="Delete Question Difficulty"
      body="This action cannot be undone."
      triggerButton={
        <LiftedButton variant="icon" className="rounded-xl bg-red-400">
          <Trash2 size={16} />
        </LiftedButton>
      }
      confirmButton={
        <Button
          isPending={deleteQuestionDifficultyMutation.isPending}
          type="button"
          variant="destructive"
          onClick={() => {
            deleteQuestionDifficultyMutation.mutate({ difficultyId: id });
          }}
        >
          Delete Difficulty
        </Button>
      }
    />
  );
};
