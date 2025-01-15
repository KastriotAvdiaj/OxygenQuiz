import { useNotifications } from "@/common/Notifications";
import { useDeleteQuestionDifficulty } from "../api/delete-question-difficulty";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui";
import { Trash2 } from "lucide-react";

type DeleteDifficultyProps = {
  id: number;
};
export const DeleteQuestionDifficulty = ({ id }: DeleteDifficultyProps) => {
  const { addNotification } = useNotifications();
  const deleteQuestionMutation = useDeleteQuestionDifficulty({
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
      isDone={deleteQuestionMutation.isSuccess}
      icon="danger"
      title="Delete Question Difficulty"
      body="Are you sure you want to delete this question difficulty?"
      triggerButton={
        <Button className="rounded-sm">
          <Trash2 size={16} />
        </Button>
      }
      confirmButton={
        <Button
          isPending={deleteQuestionMutation.isPending}
          type="button"
          variant="destructive"
          onClick={() => {
            console.log("Deleting question difficulty with ID:", id);
            deleteQuestionMutation.mutate({ difficultyId: id });
          }}
        >
          Delete Question Difficulty
        </Button>
      }
    />
  );
};
