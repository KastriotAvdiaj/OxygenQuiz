import { useNotifications } from "@/common/Notifications";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui";
import { Trash2 } from "lucide-react";
import { useDeleteDrejtimi } from "../api/delete-drejtimi";

type DeleteContractProp = {
  id: number;
};
export const DeleteDrejtimi = ({ id }: DeleteContractProp) => {
  const { addNotification } = useNotifications();
  const deleteContractMutation = useDeleteDrejtimi({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Drejtimi Deleted",
        });
      },
    },
  });

  return (
    <ConfirmationDialog
      isDone={deleteContractMutation.isSuccess}
      icon="danger"
      title="Delete Drejtimi"
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
            deleteContractMutation.mutate({ drejtimiId: id });
          }}
        >
          Delete Drejtimi
        </Button>
      }
    />
  );
};
