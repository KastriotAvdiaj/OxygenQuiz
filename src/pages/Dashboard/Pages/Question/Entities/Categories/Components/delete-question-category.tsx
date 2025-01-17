import { useNotifications } from "@/common/Notifications";
import { useDeleteQuestionCategory } from "../api/delete-question-categories";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui";
import { Trash2 } from "lucide-react";

type DeleteCategoryProps = {
  id: number;
};
export const DeleteQuestionCategory = ({ id }: DeleteCategoryProps) => {
  const { addNotification } = useNotifications();
  const deleteQuestionCategoryMutation = useDeleteQuestionCategory({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Question Category Deleted",
        });
      },
    },
  });

  return (
    <ConfirmationDialog
      isDone={deleteQuestionCategoryMutation.isSuccess}
      icon="danger"
      title="WARNING"
      body="Many Questions may be affected. This action cannot be undone."
      triggerButton={
        <Button className="rounded-sm">
          <Trash2 size={16} />
        </Button>
      }
      confirmButton={
        <Button
          isPending={deleteQuestionCategoryMutation.isPending}
          type="button"
          variant="destructive"
          onClick={() => {
            deleteQuestionCategoryMutation.mutate({ categoryId: id });
          }}
        >
          Delete Category
        </Button>
      }
    />
  );
};
