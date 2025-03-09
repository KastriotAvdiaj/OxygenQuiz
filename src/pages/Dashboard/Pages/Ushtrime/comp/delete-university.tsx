import { useNotifications } from "@/common/Notifications";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui";
import { Trash2 } from "lucide-react";
import { useDeleteUniversity } from "../api/delete-university";

type DeleteContractProp = {
  id: number;
};
export const DeleteUniversity = ({ id }: DeleteContractProp) => {
  const { addNotification } = useNotifications();
  const deleteContractMutation = useDeleteUniversity({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "University Deleted",
        });
      },
    },
  });

  return (
    <ConfirmationDialog
      isDone={deleteContractMutation.isSuccess}
      icon="danger"
      title="Delete Univeristy"
      body="This action cannot be undone."
      triggerButton={
        <Button className="rounded-xl">
          <Trash2 size={16} />
        </Button>
      }
      confirmButton={
        <Button
          isPending={deleteContractMutation.isPending}
          type="button"
          variant="destructive"
          onClick={() => {
            deleteContractMutation.mutate({ universityId: id });
          }}
        >
          Delete University
        </Button>
      }
    />
  );
};
